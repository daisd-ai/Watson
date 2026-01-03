FROM node:18-alpine

WORKDIR /app

# Install app deps
COPY ../../Watson/package*.json ./
RUN npm ci

# Copy source
COPY ../../Watson .

CMD ["npm", "run", "dev"]
