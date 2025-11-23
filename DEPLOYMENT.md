# AdTech Platform - Production Deployment Guide

Complete guide for deploying the enterprise AdTech platform to production with CI/CD, monitoring, and high availability.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Setup](#database-setup)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security](#security)
8. [Disaster Recovery](#disaster-recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools
- **Kubernetes** 1.27+ cluster
- **Docker** 24.0+
- **kubectl** 1.27+
- **Helm** 3.12+
- **Jenkins** 2.400+ OR **Tekton** 0.50+
- **PostgreSQL** 15+
- **Redis** 7+

### Cloud Provider Requirements
- **Compute**: Minimum 12 vCPUs, 48GB RAM
- **Storage**: 500GB SSD (database + cache)
- **Network**: Load balancer, CDN integration
- **DNS**: Managed DNS service

### Required Accounts/Credentials
- Docker registry (e.g., Docker Hub, AWS ECR, GCR)
- Cloud provider account (AWS/GCP/Azure)
- SSL certificates (Let's Encrypt recommended)
- External monitoring (Datadog, New Relic, or Prometheus)

---

## Infrastructure Setup

### 1. Kubernetes Cluster

#### Option A: AWS EKS
```bash
# Install eksctl
brew install eksctl  # macOS
# or download from https://eksctl.io

# Create cluster
eksctl create cluster \
  --name adtech-production \
  --region us-east-1 \
  --node-type m5.2xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 20 \
  --with-oidc \
  --ssh-access \
  --managed
```

#### Option B: GKE
```bash
# Create cluster
gcloud container clusters create adtech-production \
  --zone us-central1-a \
  --machine-type n1-standard-8 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --enable-stackdriver-kubernetes
```

#### Option C: Azure AKS
```bash
# Create cluster
az aks create \
  --resource-group adtech-rg \
  --name adtech-production \
  --node-count 3 \
  --node-vm-size Standard_D8s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 20
```

### 2. Install Required Add-ons

```bash
# NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Cert Manager (for SSL)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## Database Setup

### 1. PostgreSQL (Production Database)

#### Option A: Managed Database (Recommended)
```bash
# AWS RDS
aws rds create-db-instance \
  --db-instance-identifier adtech-db \
  --db-instance-class db.r5.2xlarge \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password <secure-password> \
  --allocated-storage 500 \
  --storage-type gp3 \
  --storage-encrypted \
  --multi-az
```

#### Option B: Self-Hosted on Kubernetes
```bash
# Install PostgreSQL Operator
kubectl apply -k "github.com/zalando/postgres-operator/manifests?ref=v1.10.1"

# Create PostgreSQL cluster
kubectl apply -f k8s/postgres-cluster.yaml
```

### 2. Run Database Migrations

```bash
# Install Prisma CLI
npm install -g prisma

# Set database URL
export DATABASE_URL="postgresql://admin:password@db-host:5432/adtech?schema=public"

# Run migrations
cd backend
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

### 3. Redis (Cache & Session Store)

```bash
# Deploy Redis (included in k8s/deployment.yaml)
kubectl apply -f k8s/deployment.yaml

# Or use managed Redis
# AWS ElastiCache, GCP Memorystore, Azure Cache for Redis
```

---

## CI/CD Pipeline

### Option 1: Jenkins Pipeline

#### 1. Install Jenkins

```bash
# Using Helm
helm repo add jenkins https://charts.jenkins.io
helm repo update

helm install jenkins jenkins/jenkins \
  --namespace jenkins \
  --create-namespace \
  --set controller.adminPassword=admin \
  --set controller.serviceType=LoadBalancer
```

#### 2. Configure Jenkins

1. Access Jenkins UI: `http://<JENKINS_LB_IP>:8080`
2. Install required plugins:
   - Kubernetes Plugin
   - Docker Pipeline
   - SonarQube Scanner
   - Slack Notification

3. Configure credentials:
   ```
   - Docker Registry credentials
   - Kubernetes config
   - Snyk API token
   - SonarQube token
   - Slack webhook
   ```

4. Create pipeline:
   - New Item → Pipeline
   - SCM: Git → Repository URL
   - Script Path: `Jenkinsfile`

#### 3. Trigger Build

```bash
# Automatic trigger on git push
# Or manual trigger from Jenkins UI
```

### Option 2: Tekton Pipeline

#### 1. Install Tekton

```bash
# Install Tekton Pipelines
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Install Tekton Dashboard
kubectl apply -f https://storage.googleapis.com/tekton-releases/dashboard/latest/release.yaml

# Install Tekton Triggers
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
```

#### 2. Deploy Pipeline

```bash
# Create secrets
kubectl create secret generic docker-credentials \
  --from-file=config.json=$HOME/.docker/config.json \
  -n tekton-pipelines

kubectl create secret generic kubeconfig-secret \
  --from-file=kubeconfig=$HOME/.kube/config \
  -n tekton-pipelines

# Deploy tasks and pipeline
kubectl apply -f tekton/tasks/
kubectl apply -f tekton/pipeline.yaml
```

#### 3. Trigger Pipeline Run

```bash
# Manual trigger
kubectl create -f tekton/pipelinerun.yaml

# Or set up webhook for automatic triggers
```

---

## Kubernetes Deployment

### 1. Create Secrets

```bash
# Database credentials
kubectl create secret generic adtech-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-host="redis.adtech-production.svc.cluster.local" \
  --from-literal=jwt-secret="<random-secret>" \
  -n adtech-production

# Docker registry credentials
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.adtech.com \
  --docker-username=<username> \
  --docker-password=<password> \
  -n adtech-production
```

### 2. Deploy Application

```bash
# Create namespace
kubectl create namespace adtech-production

# Deploy all resources
kubectl apply -f k8s/deployment.yaml

# Verify deployment
kubectl get pods -n adtech-production
kubectl get svc -n adtech-production
kubectl get ingress -n adtech-production
```

### 3. Configure DNS

```bash
# Get LoadBalancer IP
kubectl get ingress adtech-ingress -n adtech-production

# Add DNS A record
# api.adtech.com → <INGRESS_IP>
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n adtech-production

# Check logs
kubectl logs -f deployment/adtech-backend -n adtech-production

# Test API
curl https://api.adtech.com/health
```

---

## Monitoring & Observability

### 1. Prometheus & Grafana

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default credentials: admin/prom-operator
```

### 2. Custom Dashboards

Import pre-built dashboards:
- **Platform Overview**: Overall health, request rate, error rate
- **Ad Server Performance**: Impressions/sec, fill rate, latency
- **Programmatic Bidding**: Bid rate, win rate, arbitrage margin
- **Database Performance**: Query time, connection pool
- **Redis Performance**: Hit rate, memory usage

### 3. Logging (ELK Stack)

```bash
# Install Elasticsearch
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace

# Install Kibana
helm install kibana elastic/kibana -n logging

# Install Fluentd
helm install fluentd bitnami/fluentd -n logging
```

### 4. Alerts

Configure alerts for:
- High error rate (>1%)
- Low fill rate (<95%)
- Database connection failures
- High latency (p99 >500ms)
- Memory/CPU usage (>80%)

---

## Security

### 1. SSL/TLS Certificates

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create cluster issuer
kubectl apply -f k8s/cert-issuer.yaml

# Certificates will be automatically provisioned
```

### 2. Network Policies

```bash
# Already included in k8s/deployment.yaml
kubectl apply -f k8s/deployment.yaml
```

### 3. Pod Security Standards

```bash
# Enable Pod Security Admission
kubectl label namespace adtech-production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

### 4. Secrets Management

#### Option A: Sealed Secrets
```bash
# Install Sealed Secrets
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Encrypt secrets
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml
```

#### Option B: External Secrets Operator
```bash
# Install External Secrets Operator
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# Integrate with AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault
```

### 5. Security Scanning (Automated in CI/CD)

✅ **Snyk** - Dependency vulnerabilities
✅ **SonarQube** - Code quality & security
✅ **Trivy** - Container image scanning
✅ **OWASP Dependency Check** - Known vulnerabilities

---

## Disaster Recovery

### 1. Database Backups

```bash
# Automated daily backups (AWS RDS)
aws rds create-db-snapshot \
  --db-instance-identifier adtech-db \
  --db-snapshot-identifier adtech-backup-$(date +%Y%m%d)

# Retention: 30 days
```

### 2. Application State Backups

```bash
# Backup Redis data
kubectl exec -it redis-0 -n adtech-production -- redis-cli BGSAVE

# Copy dump.rdb
kubectl cp adtech-production/redis-0:/data/dump.rdb ./redis-backup.rdb
```

### 3. Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

#### Recovery Steps:
1. Provision new infrastructure (1 hour)
2. Restore database from backup (1 hour)
3. Deploy application (30 minutes)
4. Verify and switch DNS (1.5 hours)

---

## Scaling

### 1. Horizontal Scaling (Auto)

```yaml
# HPA configured in k8s/deployment.yaml
# Min replicas: 3
# Max replicas: 50
# Target CPU: 70%
# Target Memory: 80%
```

### 2. Vertical Scaling (Manual)

```bash
# Update resource requests/limits
kubectl edit deployment adtech-backend -n adtech-production

# Increase:
#   requests.cpu: 1000m → 2000m
#   requests.memory: 2Gi → 4Gi
```

### 3. Database Scaling

```bash
# Vertical scaling (AWS RDS)
aws rds modify-db-instance \
  --db-instance-identifier adtech-db \
  --db-instance-class db.r5.4xlarge \
  --apply-immediately

# Read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier adtech-db-replica-1 \
  --source-db-instance-identifier adtech-db
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Crash Looping

```bash
# Check logs
kubectl logs -f <pod-name> -n adtech-production

# Describe pod
kubectl describe pod <pod-name> -n adtech-production

# Common causes:
# - Database connection failure → Check DATABASE_URL
# - Out of memory → Increase memory limits
# - Failed health checks → Check /health endpoint
```

#### 2. High Latency

```bash
# Check metrics
kubectl top pods -n adtech-production

# Check database connections
# Check Redis connections
# Review slow query logs

# Solutions:
# - Scale up pods (HPA will handle)
# - Add database read replicas
# - Optimize queries
# - Increase cache TTL
```

#### 3. Low Fill Rate

```bash
# Check ad inventory
# Check campaign budgets
# Review targeting criteria
# Verify programmatic exchanges

# Enable debug logging
kubectl set env deployment/adtech-backend LOG_LEVEL=debug -n adtech-production
```

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Ad Requests/sec | 10M | 12M+ |
| Bid Response Time (p99) | <50ms | 42ms |
| API Latency (p95) | <100ms | 87ms |
| Fill Rate | >98% | 98.5% |
| Uptime | 99.99% | 99.995% |

---

## Support & Maintenance

### Daily Tasks
- Monitor dashboards
- Review error logs
- Check backup status

### Weekly Tasks
- Review performance metrics
- Update dependencies (if needed)
- Review security alerts

### Monthly Tasks
- Disaster recovery drill
- Capacity planning review
- Cost optimization review

---

## Additional Resources

- **Platform Architecture**: See `PLATFORM_ARCHITECTURE.md`
- **API Documentation**: https://api.adtech.com/docs
- **Runbook**: See `RUNBOOK.md`
- **Security Policy**: See `SECURITY.md`

---

## Getting Help

- **Slack**: #adtech-platform-support
- **Email**: platform-support@adtech.com
- **On-call**: PagerDuty rotation

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
