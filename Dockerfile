FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala todas as dependências (sem restrições de produção)
RUN npm install

# Copia o resto do código
COPY . .

# Faz o build do Vite
RUN npm run build

# Fase de Produção usando Nginx
FROM nginx:alpine

# Copia os arquivos gerados no build para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração customizada do Nginx para suportar React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 3000 (padrão do Dokploy)
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
