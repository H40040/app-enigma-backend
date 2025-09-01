#!/bin/bash

# Script de Deploy para Ambiente de Desenvolvimento
# Enigma Crush - Deploy Dev

set -e

echo "��� Iniciando deploy para ambiente de desenvolvimento..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se estamos na branch develop
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    log_warning "Você não está na branch develop. Branch atual: $CURRENT_BRANCH"
    read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deploy cancelado."
        exit 1
    fi
fi

# 1. Executar testes
log_info "Executando testes..."
if npm run test:ci; then
    log_success "Todos os testes passaram!"
else
    log_error "Alguns testes falharam. Verifique os erros acima."
    read -p "Deseja continuar com o deploy mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deploy cancelado devido a falhas nos testes."
        exit 1
    fi
fi

# 2. Build do projeto
log_info "Fazendo build do projeto..."
if npm run build; then
    log_success "Build concluído com sucesso!"
else
    log_error "Falha no build. Verifique os erros acima."
    exit 1
fi

# 3. Commit e push (se houver mudanças)
if [ -n "$(git status --porcelain)" ]; then
    log_info "Detectadas mudanças locais. Fazendo commit..."
    git add .
    git commit -m "Deploy dev: $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin develop
    log_success "Mudanças enviadas para o repositório!"
else
    log_info "Nenhuma mudança local detectada."
fi

# 4. Trigger deploy no Render (via webhook se configurado)
if [ ! -z "$RENDER_DEPLOY_HOOK_DEV" ]; then
    log_info "Disparando deploy no Render..."
    curl -X POST "$RENDER_DEPLOY_HOOK_DEV"
    log_success "Deploy disparado no Render!"
else
    log_warning "RENDER_DEPLOY_HOOK_DEV não configurado. Deploy manual necessário."
    log_info "Acesse: https://dashboard.render.com e faça o deploy manualmente."
fi

# 5. Aguardar e validar deploy
log_info "Aguardando deploy ser concluído..."
sleep 60

log_info "Validando deploy..."
if node scripts/health-check.js; then
    log_success "Deploy de desenvolvimento concluído com sucesso! ���"
    log_info "Backend Dev: https://app-enigma-backend.onrender.com"
    log_info "Frontend Dev: https://app-enigma-frontend-kt0gd0i5h-h40040s-projects.vercel.app"
else
    log_error "Falha na validação do deploy. Verifique os logs do Render."
    exit 1
fi

log_success "�� Deploy para desenvolvimento finalizado!"
