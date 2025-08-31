#!/bin/bash

# Enigma Crush Backend - Production Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="enigma-crush-backend"
DOCKER_IMAGE="$APP_NAME:latest"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env file not found. Creating from .env.production template..."
        if [ -f ".env.production" ]; then
            cp .env.production .env
            log_warning "Please update .env file with your production values before continuing"
            read -p "Press Enter to continue after updating .env file..."
        else
            log_error ".env.production template not found"
            exit 1
        fi
    fi
    
    log_success "Prerequisites check completed"
}

backup_database() {
    log "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Get database connection details from .env
    source .env
    
    if [ -n "$DATABASE_URL" ]; then
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Extract database details from DATABASE_URL
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
        
        if command -v pg_dump &> /dev/null; then
            PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
            log_success "Database backup created: $BACKUP_FILE"
        else
            log_warning "pg_dump not found. Skipping database backup."
        fi
    else
        log_warning "DATABASE_URL not found in .env. Skipping database backup."
    fi
}

run_tests() {
    log "Running tests..."
    
    if npm test; then
        log_success "All tests passed"
    else
        log_error "Tests failed. Deployment aborted."
        exit 1
    fi
}

build_application() {
    log "Building application..."
    
    # Build Docker image
    if docker build -t "$DOCKER_IMAGE" .; then
        log_success "Docker image built successfully"
    else
        log_error "Docker build failed"
        exit 1
    fi
}

deploy_application() {
    log "Deploying application..."
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose down || true
    
    # Start new containers
    log "Starting new containers..."
    if docker-compose up -d; then
        log_success "Application deployed successfully"
    else
        log_error "Deployment failed"
        exit 1
    fi
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    log "Running database migrations..."
    if docker-compose exec -T app npx prisma migrate deploy; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        exit 1
    fi
}

run_health_check() {
    log "Running health check..."
    
    # Wait a bit more for the application to fully start
    sleep 10
    
    # Run health check
    if docker-compose exec -T app node scripts/health-check.js; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
}

cleanup() {
    log "Cleaning up..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove old backups (keep last 10)
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR"/backup_*.sql | tail -n +11 | xargs -r rm
        log_success "Old backups cleaned up"
    fi
}

show_status() {
    log "Deployment Status:"
    echo "=================="
    docker-compose ps
    echo ""
    log "Application logs (last 20 lines):"
    docker-compose logs --tail=20 app
}

# Main deployment process
main() {
    log "Starting deployment of $APP_NAME"
    
    # Create logs directory
    mkdir -p logs
    
    # Check if this is a production environment
    if [ "$NODE_ENV" != "production" ] && [ "$1" != "--force" ]; then
        log_warning "This doesn't appear to be a production environment"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled"
            exit 0
        fi
    fi
    
    check_prerequisites
    backup_database
    run_tests
    build_application
    deploy_application
    run_health_check
    cleanup
    show_status
    
    log_success "Deployment completed successfully!"
    log "Application is running at: http://localhost:4006"
    log "Health check endpoint: http://localhost:4006/api/health"
}

# Handle script arguments
case "$1" in
    "--help" | "-h")
        echo "Usage: $0 [OPTIONS]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --force        Force deployment even if not in production environment"
        echo "  --no-tests     Skip running tests"
        echo "  --no-backup    Skip database backup"
        exit 0
        ;;
    "--no-tests")
        run_tests() { log_warning "Skipping tests as requested"; }
        ;;
    "--no-backup")
        backup_database() { log_warning "Skipping database backup as requested"; }
        ;;
esac

# Run main function
main "$@"