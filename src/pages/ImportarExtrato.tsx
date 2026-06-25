import { useState, useRef, useCallback, useMemo } from 'react'
import { Upload, Camera, CheckCircle, XCircle, Loader2, Eye, Trash2, AlertCircle, ArrowRight } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, toDateInput, mesesLongos } from '../utils/formatters'
import { uid } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { GrupoGasto, FonteRenda } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DetectedRow {
  id: string
  selected: boolean
  data: string
  descricao: string
  valor: number
  tipo: 'credito' | 'debito'
  confidence?: number
}

type TabType = 'csv' | 'pdf' | 'foto'
type StatusType = 'idle' | 'processing' | 'done' | 'error'
type ImportTarget = 'transacoes' | 'pagar' | 'receber'

// ─── CSV Parsing Helpers ──────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    else if ((ch === ',' || ch === ';') && !inQuotes) { result.push(current.trim()); current = '' }
    else current += ch
  }
  result.push(current.trim())
  return result
}

function findColIndex(headers: string[], keywords: string[]): number {
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
  for (const kw of keywords) {
    const idx = headers.findIndex(h => normalize(h).includes(normalize(kw)))
    if (idx >= 0) return idx
  }
  return -1
}

function parseBRCurrency(s: string): number {
  if (!s) return 0
  const clean = s.replace(/[^\d,.-]/g, '')
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',')
    const lastDot = clean.lastIndexOf('.')
    if (lastComma > lastDot) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
    return parseFloat(clean.replace(/,/g, '')) || 0
  }
  if (clean.includes(',')) return parseFloat(clean.replace(',', '.')) || 0
  return parseFloat(clean) || 0
}

function parseDateBR(s: string): string {
  if (!s) return toDateInput()
  const s2 = s.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s2)) return s2.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s2.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? '20' + y : y
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return toDateInput()
}

function parseCSV(text: string): DetectedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const rawHeaders = parseCSVLine(lines[0].replace(/;/g, ','))
  const headers = rawHeaders.map(h => h.replace(/"/g, '').trim())

  const dateIdx = findColIndex(headers, ['data', 'date', 'dt lançamento', 'dt', 'lancamento'])
  const descIdx = findColIndex(headers, ['descricao', 'historico', 'memo', 'description', 'lançamento', 'lancamento', 'histórico'])
  const valIdx = findColIndex(headers, ['valor', 'amount', 'value', 'vlr'])
  const creditIdx = findColIndex(headers, ['credito', 'credit', 'entrada', 'crédito'])
  const debitIdx = findColIndex(headers, ['debito', 'debit', 'saída', 'debito', 'saida'])

  if (dateIdx < 0 && descIdx < 0 && valIdx < 0) return []

  const rows: DetectedRow[] = []
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const rawLine = line.replace(/;/g, ',')
    const cols = parseCSVLine(rawLine)

    const dateStr = dateIdx >= 0 ? cols[dateIdx] ?? '' : ''
    const desc = descIdx >= 0 ? (cols[descIdx] ?? '').replace(/"/g, '').trim() : ''
    let valor = 0
    let tipo: 'credito' | 'debito' = 'debito'

    if (creditIdx >= 0 && debitIdx >= 0) {
      const c = parseBRCurrency(cols[creditIdx] ?? '')
      const d = parseBRCurrency(cols[debitIdx] ?? '')
      if (c > 0) { valor = c; tipo = 'credito' }
      else if (d > 0) { valor = d; tipo = 'debito' }
    } else if (valIdx >= 0) {
      const raw = cols[valIdx] ?? ''
      valor = parseBRCurrency(raw)
      tipo = raw.trim().startsWith('-') ? 'debito' : 'credito'
    }

    if (!desc || valor <= 0) continue
    rows.push({ id: uid(), selected: true, data: parseDateBR(dateStr), descricao: desc.slice(0, 100), valor, tipo })
  }
  return rows
}

// ─── Text Transaction Extractor (for PDF/OCR text) ───────────────────────────

function parseTransactionsFromText(text: string): DetectedRow[] {
  const lines = text.split('\n').filter(l => l.trim().length > 3)
  const results: DetectedRow[] = []
  const valueRegex = /(?:R\$\s*)?([\d.]{1,10},\d{2})/g
  const dateRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/

  for (const line of lines) {
    const values = [...line.matchAll(valueRegex)]
    if (!values.length) continue

    const largest = values.reduce((max, m) => {
      const v = parseBRCurrency(m[1])
      return v > max.v ? { v, str: m[0] } : max
    }, { v: 0, str: '' })
    if (largest.v < 1) continue

    const dateMatch = line.match(dateRegex)
    const descricao = line
      .replace(dateMatch?.[0] ?? '', '')
      .replace(valueRegex, '')
      .replace(/R\$\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)

    if (descricao.length < 3) continue

    results.push({
      id: uid(), selected: true,
      data: dateMatch ? parseDateBR(dateMatch[0]) : toDateInput(),
      descricao,
      valor: largest.v,
      tipo: line.includes('-') ? 'debito' : 'credito',
      confidence: 70,
    })
  }
  return results
}

// ─── Receipt Single-Item Extractor (for photos) ──────────────────────────────

function parseReceiptFromText(text: string): DetectedRow[] {
  const lines = text.split('\n').filter(l => l.trim())
  const valueRegex = /(?:R\$\s*)?([\d.]{1,10},\d{2})/g
  const dateRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/

  let total = 0
  let totalLine = ''
  // Prefer line with TOTAL keyword
  for (const line of lines) {
    if (/total|subtotal/i.test(line)) {
      const m = line.match(valueRegex)
      if (m) { total = parseBRCurrency(m[0]); totalLine = line; break }
    }
  }
  // Fallback: largest value found
  if (total === 0) {
    for (const line of lines) {
      for (const m of [...line.matchAll(valueRegex)]) {
        const v = parseBRCurrency(m[1])
        if (v > total) total = v
      }
    }
  }

  // Date
  let data = toDateInput()
  for (const line of lines) {
    const m = line.match(dateRegex)
    if (m) { data = parseDateBR(m[0]); break }
  }

  // Description: first non-numeric line, skip short/numeric lines
  const descricao = lines.find(l =>
    l.trim().length > 4 &&
    !/^\d+$/.test(l.trim()) &&
    !/CNPJ|CPF|IE:|Endereço|Rua|Av\.|Tel\.|Fax/i.test(l) &&
    !l.includes(totalLine)
  ) ?? 'Despesa (foto)'

  if (total === 0) return []
  return [{ id: uid(), selected: true, data, descricao: descricao.trim().slice(0, 80), valor: total, tipo: 'debito', confidence: 75 }]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportarExtrato() {
  const { addTransacao, addContaPagar, addContaReceber, contasBancarias, mesAtivo, anoAtivo } = useFinanceStore()

  const [tab, setTab] = useState<TabType>('csv')
  const [status, setStatus] = useState<StatusType>('idle')
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [rows, setRows] = useState<DetectedRow[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [importTarget, setImportTarget] = useState<ImportTarget>('transacoes')
  const [contaId, setContaId] = useState<string>('')
  const [grupo, setGrupo] = useState<GrupoGasto>('outros')
  const [fonte, setFonte] = useState<FonteRenda>('pessoal')
  const [isDragging, setIsDragging] = useState(false)
  const [importDone, setImportDone] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const selectedRows = useMemo(() => rows.filter(r => r.selected), [rows])
  const totalDebito = useMemo(() => selectedRows.filter(r => r.tipo === 'debito').reduce((s, r) => s + r.valor, 0), [selectedRows])
  const totalCredito = useMemo(() => selectedRows.filter(r => r.tipo === 'credito').reduce((s, r) => s + r.valor, 0), [selectedRows])

  const toggleRow = (id: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  const toggleAll = () => {
    const all = rows.every(r => r.selected)
    setRows(prev => prev.map(r => ({ ...r, selected: !all })))
  }
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))
  const editRow = (id: string, field: keyof DetectedRow, value: unknown) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

  const processCSV = useCallback(async (file: File) => {
    setStatus('processing'); setStatusMsg('Lendo arquivo CSV...')
    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      if (!parsed.length) throw new Error('Nenhuma transação detectada. Verifique o formato do arquivo.')
      setRows(parsed)
      setStatus('done')
    } catch (e) {
      setStatusMsg((e as Error).message); setStatus('error')
    }
  }, [])

  const processPDF = useCallback(async (file: File) => {
    setStatus('processing'); setStatusMsg('Carregando biblioteca PDF...')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      setStatusMsg('Extraindo texto do PDF...')
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        setStatusMsg(`Lendo página ${i} de ${pdf.numPages}...`)
        setProgress(Math.round((i / pdf.numPages) * 80))
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        fullText += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n'
      }

      setStatusMsg('Analisando transações...')
      const parsed = parseTransactionsFromText(fullText)
      if (!parsed.length) throw new Error('Nenhuma transação detectada no PDF. Se for PDF escaneado, use a aba Foto.')
      setRows(parsed)
      setStatus('done')
    } catch (e) {
      setStatusMsg((e as Error).message); setStatus('error')
    }
  }, [])

  const processPhoto = useCallback(async (file: File) => {
    setStatus('processing'); setProgress(0); setStatusMsg('Iniciando reconhecimento de texto (OCR)...')
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    try {
      const Tesseract = await import('tesseract.js')
      setStatusMsg('Carregando motor OCR...')
      const worker = await Tesseract.createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
            setStatusMsg(`Reconhecendo texto... ${Math.round(m.progress * 100)}%`)
          }
        }
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      setStatusMsg('Interpretando dados...')
      const parsed = parseReceiptFromText(text)
      if (!parsed.length) throw new Error('Não foi possível extrair valores da imagem. Tente com foto mais nítida.')
      setRows(parsed)
      setStatus('done')
    } catch (e) {
      setStatusMsg((e as Error).message || 'Erro no OCR'); setStatus('error')
    }
  }, [])

  const handleFile = useCallback((file: File) => {
    setRows([]); setImportDone(false); setProgress(0)
    if (tab === 'csv') processCSV(file)
    else if (tab === 'pdf') processPDF(file)
    else processPhoto(file)
  }, [tab, processCSV, processPDF, processPhoto])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const confirmarImport = () => {
    const hoje = toDateInput()
    const contaBancId = contaId || contasBancarias[0]?.id || ''
    let count = 0

    for (const r of selectedRows) {
      if (importTarget === 'transacoes') {
        addTransacao({
          data: r.data, descricao: r.descricao, valor: r.valor,
          tipo: r.tipo, contaId: contaBancId,
          conciliado: false, statusConciliacao: 'pendente',
          banco: contasBancarias.find(c => c.id === contaBancId)?.banco ?? 'Importado',
          categoria: 'Importação',
        })
      } else if (importTarget === 'pagar') {
        const d = new Date(r.data + 'T00:00:00')
        addContaPagar({
          descricao: r.descricao, valor: r.valor, vencimento: r.data,
          status: 'pendente', grupo, fonte, categoria: 'Importado',
          prioridade: 'media', origem: 'manual',
          mesReferencia: d.getMonth() + 1, anoReferencia: d.getFullYear(),
        })
      } else {
        const d = new Date(r.data + 'T00:00:00')
        addContaReceber({
          descricao: r.descricao, valor: r.valor, vencimento: hoje,
          status: 'pendente', fonte, categoria: 'Importado',
          mesReferencia: d.getMonth() + 1, anoReferencia: d.getFullYear(),
        })
      }
      count++
    }
    setImportDone(true)
    setStatusMsg(`${count} registro${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''} com sucesso!`)
  }

  const reset = () => {
    setRows([]); setStatus('idle'); setStatusMsg(''); setProgress(0)
    setImagePreview(null); setImportDone(false)
  }

  const accept = tab === 'csv' ? '.csv,text/csv' : tab === 'pdf' ? '.pdf,application/pdf' : 'image/*'
  const tabLabels = { csv: '📄 CSV', pdf: '📑 PDF', foto: '📷 Foto / Câmera' }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['csv', 'pdf', 'foto'] as TabType[]).map(t => (
          <button key={t} onClick={() => { setTab(t); reset() }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Info por aba */}
      {tab === 'csv' && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Suporta exportação de <strong>Nubank, Itaú, Bradesco, Santander, C6 Bank, Banco do Brasil</strong> e qualquer CSV com colunas de data, descrição e valor.</span>
        </div>
      )}
      {tab === 'pdf' && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Funciona com PDFs de extrato <strong>gerados digitalmente</strong> (não escaneados). Para PDFs escaneados ou imagens, use a aba <strong>Foto</strong>.</span>
        </div>
      )}
      {tab === 'foto' && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          <Camera size={16} className="flex-shrink-0 mt-0.5" />
          <span>Tire uma foto de <strong>nota fiscal, cupom, boleto ou qualquer papel</strong> com valores. O sistema reconhece automaticamente via OCR e pré-preenche o lançamento.</span>
        </div>
      )}

      <div className={`grid gap-5 ${imagePreview ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Drop Zone / Upload Area */}
        {status === 'idle' || status === 'error' ? (
          <Card className="p-0 overflow-hidden">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-xl transition-colors cursor-pointer
                ${isDragging ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                ${status === 'error' ? 'border-red-300 bg-red-50' : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              {status === 'error' ? (
                <>
                  <XCircle size={40} className="text-red-400" />
                  <div className="text-center">
                    <div className="font-semibold text-red-600 mb-1">Erro ao processar</div>
                    <div className="text-sm text-red-500 max-w-sm">{statusMsg}</div>
                  </div>
                  <Button variant="secondary" onClick={e => { e.stopPropagation(); reset() }}>Tentar novamente</Button>
                </>
              ) : (
                <>
                  {tab === 'foto' ? <Camera size={40} className="text-slate-300" /> : <Upload size={40} className="text-slate-300" />}
                  <div className="text-center">
                    <div className="font-semibold text-slate-600 mb-1">
                      {tab === 'foto' ? 'Enviar imagem ou tirar foto' : `Arraste o arquivo ${tab.toUpperCase()} aqui`}
                    </div>
                    <div className="text-sm text-slate-400">ou clique para selecionar</div>
                  </div>
                  {tab === 'foto' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={e => { e.stopPropagation(); cameraRef.current?.click() }}>
                        <Camera size={14} /> Câmera
                      </Button>
                      <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
                        <Upload size={14} /> Galeria
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept={accept} className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </Card>
        ) : status === 'processing' ? (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-5">
              <div className="relative w-16 h-16">
                <Loader2 size={64} className="text-emerald-500 animate-spin" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-700 mb-1">{statusMsg}</div>
                {progress > 0 && (
                  <div className="w-64 mx-auto">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{progress}%</div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : null}

        {/* Preview da foto */}
        {imagePreview && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain max-h-72" />
          </div>
        )}
      </div>

      {/* Resultado importação bem-sucedida */}
      {importDone && (
        <Card className="p-5">
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle size={24} />
            <div>
              <div className="font-semibold">{statusMsg}</div>
              <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 mt-0.5">← Importar outro arquivo</button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela de preview */}
      {status === 'done' && rows.length > 0 && !importDone && (
        <>
          {/* Resumo */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg text-sm">
              <ArrowRight size={13} className="text-red-500 rotate-45" />
              <span className="text-red-600 font-medium">{rows.filter(r => r.selected && r.tipo === 'debito').length}x Débito: {formatCurrency(totalDebito)}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg text-sm">
              <ArrowRight size={13} className="text-emerald-500 -rotate-45" />
              <span className="text-emerald-600 font-medium">{rows.filter(r => r.selected && r.tipo === 'credito').length}x Crédito: {formatCurrency(totalCredito)}</span>
            </div>
            <span className="text-xs text-slate-400 ml-auto">{selectedRows.length} de {rows.length} selecionados</span>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">← Novo arquivo</button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-3 w-8">
                      <input type="checkbox" checked={rows.every(r => r.selected)} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(r => (
                    <tr key={r.id} className={`${!r.selected ? 'opacity-40' : ''} hover:bg-slate-50`}>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={r.selected} onChange={() => toggleRow(r.id)} className="rounded" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="date" value={r.data} onChange={e => editRow(r.id, 'data', e.target.value)}
                          className="text-[16px] sm:text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-400 w-32" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input value={r.descricao} onChange={e => editRow(r.id, 'descricao', e.target.value)}
                          className="text-[16px] sm:text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-400 w-full min-w-48" />
                        {r.confidence && r.confidence < 80 && (
                          <div className="text-xs text-amber-500 mt-0.5">⚠ Confiança baixa — revise</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input type="number" value={r.valor} onChange={e => editRow(r.id, 'valor', parseFloat(e.target.value))}
                          className="text-[16px] sm:text-sm font-semibold border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-400 w-28 text-right" />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <select value={r.tipo} onChange={e => editRow(r.id, 'tipo', e.target.value)}
                          className="text-[16px] sm:text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-white">
                          <option value="debito">Débito</option>
                          <option value="credito">Crédito</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => removeRow(r.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Opções de importação */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700 mb-4">Importar como:</div>
            <div className="grid md:grid-cols-3 gap-3 mb-5">
              {([
                { value: 'transacoes', label: 'Transação Bancária', desc: 'Para conciliação de extrato', icon: '🏦' },
                { value: 'pagar', label: 'Conta a Pagar', desc: 'Despesas e obrigações', icon: '💳' },
                { value: 'receber', label: 'Conta a Receber', desc: 'Valores a receber', icon: '💰' },
              ] as const).map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors
                  ${importTarget === opt.value ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="importTarget" value={opt.value} checked={importTarget === opt.value}
                    onChange={() => setImportTarget(opt.value)} className="mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-700 text-sm">{opt.icon} {opt.label}</div>
                    <div className="text-xs text-slate-400">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {importTarget === 'transacoes' && contasBancarias.length > 0 && (
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Conta Bancária</label>
                  <select value={contaId} onChange={e => setContaId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                    {contasBancarias.map(c => <option key={c.id} value={c.id}>{c.banco} — {c.nome}</option>)}
                  </select>
                </div>
              )}
              {(importTarget === 'pagar' || importTarget === 'receber') && (
                <>
                  <div className="flex-1 min-w-40">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Fonte</label>
                    <select value={fonte} onChange={e => setFonte(e.target.value as FonteRenda)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                      <option value="pessoal">Pessoal</option>
                      <option value="empresa">Empresa</option>
                    </select>
                  </div>
                  {importTarget === 'pagar' && (
                    <div className="flex-1 min-w-40">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Grupo</label>
                      <select value={grupo} onChange={e => setGrupo(e.target.value as GrupoGasto)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                        {(['casa','carro','viagens','alimentacao','saude','educacao','lazer','outros'] as GrupoGasto[]).map(g => (
                          <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
              <div className="text-sm text-slate-500">
                <strong>{selectedRows.length}</strong> registro{selectedRows.length !== 1 ? 's' : ''} · {formatCurrency(totalDebito + totalCredito)} total
              </div>
              <Button onClick={confirmarImport} disabled={selectedRows.length === 0}>
                <CheckCircle size={16} />
                Importar {selectedRows.length} Registro{selectedRows.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Estado vazio pós-done mas sem rows */}
      {status === 'done' && rows.length === 0 && (
        <Card className="p-8 text-center">
          <Eye size={32} className="text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">Nenhuma transação detectada</div>
          <button onClick={reset} className="text-sm text-emerald-600 mt-2 hover:underline">Tentar outro arquivo</button>
        </Card>
      )}

      {/* Dica mês ativo */}
      {status === 'idle' && (
        <Card className="p-4">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
            <span>As datas de importação determinam automaticamente em qual mês o lançamento aparece. Mês ativo: <strong className="text-slate-700">{mesesLongos[mesAtivo - 1]} {anoAtivo}</strong>.</span>
          </div>
        </Card>
      )}
    </div>
  )
}
