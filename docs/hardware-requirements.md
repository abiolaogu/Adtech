# Hardware Requirements — Adtech Platform
> Version: 1.0 | Last Updated: 2026-02-18 | Status: Draft
> Classification: Internal | Author: AIDD System

---

## 1. Overview

This document specifies the hardware and infrastructure requirements for deploying the Adtech Platform across development, staging, and production environments. Requirements are sized based on expected impression volume, concurrent users, and data retention needs.

---

## 2. Environment Sizing Summary

| Resource | Development | Staging | Production (1B imp/mo) | Production (10B imp/mo) |
|----------|------------|---------|----------------------|------------------------|
| CPU Cores | 2 | 4 | 24 | 96 |
| RAM | 4 GB | 8 GB | 48 GB | 192 GB |
| Storage (SSD) | 20 GB | 50 GB | 500 GB | 2 TB |
| Network | 100 Mbps | 500 Mbps | 1 Gbps | 10 Gbps |
| Estimated Cost | $50/mo | $200/mo | $3,000/mo | $10,000/mo |

---

## 3. Development Environment

### 3.1 Minimum Requirements
| Component | Specification |
|-----------|--------------|
| CPU | 2 cores (Intel i5 / Apple M1 or equivalent) |
| RAM | 4 GB |
| Storage | 20 GB SSD |
| OS | macOS 12+, Ubuntu 20.04+, or Windows 10 with WSL2 |
| Network | Broadband internet connection |

### 3.2 Recommended Requirements
| Component | Specification |
|-----------|--------------|
| CPU | 4+ cores (Intel i7 / Apple M1 Pro or equivalent) |
| RAM | 8 GB+ |
| Storage | 50 GB SSD |
| OS | macOS 13+ or Ubuntu 22.04+ |

### 3.3 Required Software
| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x+ | JavaScript runtime |
| PostgreSQL | 14.x+ | Primary database |
| Redis | 6.x+ | Cache and stream processing |
| Docker | 24.x+ | Containerization |
| Git | 2.x+ | Version control |

---

## 4. Staging Environment

### 4.1 Compute
| Component | Specification |
|-----------|--------------|
| Kubernetes Nodes | 2 nodes, each with 2 vCPU and 4 GB RAM |
| Backend Pods | 2 replicas |
| Total vCPU | 4 |
| Total RAM | 8 GB |

### 4.2 Database
| Component | Specification |
|-----------|--------------|
| PostgreSQL | 1 instance, 2 vCPU, 4 GB RAM, 50 GB SSD |
| Redis | 1 instance, 1 vCPU, 2 GB RAM |

### 4.3 Network
| Component | Specification |
|-----------|--------------|
| Load Balancer | 1 (NGINX Ingress) |
| Bandwidth | 500 Mbps |
| Static IP | 1 (for ingress) |

---

## 5. Production Environment (1B Impressions/Month)

### 5.1 Compute Cluster
| Component | Specification |
|-----------|--------------|
| Kubernetes Nodes | 3 nodes, each with 8 vCPU and 16 GB RAM |
| Backend Pods | 3-15 replicas (HPA managed) |
| Pod Resources | 500m-2000m CPU, 1-4 GB RAM per pod |
| Total vCPU | 24 |
| Total RAM | 48 GB |

### 5.2 Database Tier
| Component | Specification |
|-----------|--------------|
| PostgreSQL Primary | 1 instance: 4 vCPU, 16 GB RAM, 200 GB SSD (IOPS: 3000) |
| PostgreSQL Replica | 1 instance: 4 vCPU, 16 GB RAM, 200 GB SSD (read-only) |
| Redis Cache | 1 instance: 2 vCPU, 8 GB RAM |
| Redis Streams | 1 instance: 2 vCPU, 4 GB RAM, 20 GB SSD (persistence) |

### 5.3 Storage
| Type | Size | Purpose |
|------|------|---------|
| Database Storage | 200 GB SSD (gp3, 3000 IOPS) | Campaign, user, inventory data |
| Analytics Storage | 200 GB SSD | ImpressionLog table (90-day hot retention) |
| Redis Persistence | 20 GB SSD | AOF and RDB snapshots |
| Backup Storage | 100 GB | Daily database snapshots (30-day retention) |

### 5.4 Network
| Component | Specification |
|-----------|--------------|
| Load Balancer | 1 (NGINX Ingress with SSL termination) |
| CDN | Cloudflare or AWS CloudFront |
| Bandwidth | 1 Gbps |
| Static IPs | 2 (ingress + failover) |

---

## 6. Production Environment (10B Impressions/Month)

### 6.1 Compute Cluster
| Component | Specification |
|-----------|--------------|
| Kubernetes Nodes | 6 nodes, each with 16 vCPU and 32 GB RAM |
| Backend Pods | 10-50 replicas (HPA managed) |
| Pod Resources | 500m-2000m CPU, 1-4 GB RAM per pod |
| Total vCPU | 96 |
| Total RAM | 192 GB |

### 6.2 Database Tier
| Component | Specification |
|-----------|--------------|
| PostgreSQL Primary | 1 instance: 8 vCPU, 32 GB RAM, 500 GB SSD (IOPS: 10000) |
| PostgreSQL Replicas | 3 instances: 8 vCPU, 32 GB RAM each |
| ClickHouse (Analytics) | 2 instances: 8 vCPU, 32 GB RAM, 1 TB SSD each |
| Redis Cluster | 3-node cluster: 4 vCPU, 16 GB RAM each |

### 6.3 Storage
| Type | Size | Purpose |
|------|------|---------|
| Database Storage | 500 GB SSD (io2, 10000 IOPS) | Transactional data |
| Analytics Storage | 2 TB SSD | ClickHouse columnar store |
| Redis Persistence | 60 GB SSD | Cluster persistence |
| Backup Storage | 500 GB | Daily snapshots + WAL archiving |
| Archive Storage | 5 TB HDD/S3 | Historical impression data (2-year retention) |

### 6.4 Network
| Component | Specification |
|-----------|--------------|
| Load Balancer | 2 (primary + failover) |
| CDN | Multi-region CDN (Cloudflare Enterprise) |
| Bandwidth | 10 Gbps |
| Inter-region Link | Dedicated 1 Gbps (for multi-region) |

---

## 7. Cloud Provider Recommendations

### 7.1 AWS (Recommended)
| Service | Resource | Specification |
|---------|----------|--------------|
| EKS | Kubernetes cluster | m5.2xlarge nodes (8 vCPU, 32 GB) |
| RDS | PostgreSQL | db.r5.2xlarge (8 vCPU, 64 GB) Multi-AZ |
| ElastiCache | Redis | cache.r5.xlarge (4 vCPU, 26 GB) |
| S3 | Backup storage | Standard tier |
| CloudFront | CDN | Global edge locations |
| Route 53 | DNS | Latency-based routing |

### 7.2 GCP
| Service | Resource | Specification |
|---------|----------|--------------|
| GKE | Kubernetes cluster | n1-standard-8 nodes |
| Cloud SQL | PostgreSQL | db-custom-8-32768 |
| Memorystore | Redis | 16 GB instance |
| Cloud Storage | Backups | Standard tier |
| Cloud CDN | CDN | Global edge |

### 7.3 Azure
| Service | Resource | Specification |
|---------|----------|--------------|
| AKS | Kubernetes cluster | Standard_D8s_v3 nodes |
| Azure Database | PostgreSQL Flexible | 8 vCPU, 32 GB |
| Azure Cache | Redis | Premium P3 (26 GB) |
| Blob Storage | Backups | Hot tier |
| Azure CDN | CDN | Global POP locations |

---

## 8. High Availability Requirements

| Component | HA Mechanism | Min Replicas |
|-----------|-------------|-------------|
| Backend Pods | HPA + PDB | 3 |
| PostgreSQL | Multi-AZ (managed) or streaming replication | 2 (primary + standby) |
| Redis | Redis Sentinel or managed HA | 2 (primary + replica) |
| Load Balancer | Managed (cloud provider) | 2 (active-passive) |
| DNS | Multi-provider or cloud managed | N/A |

---

## 9. Monitoring Infrastructure

| Component | Specification |
|-----------|--------------|
| Prometheus | 1 instance: 2 vCPU, 8 GB RAM, 100 GB SSD (metrics retention: 30 days) |
| Grafana | 1 instance: 1 vCPU, 2 GB RAM |
| ELK Stack | Elasticsearch: 3 nodes, 4 vCPU, 16 GB RAM each, 200 GB SSD |
| Alerting | PagerDuty or Opsgenie integration |

---

## 10. Capacity Planning Formula

```
Required Pods = (Peak Impressions per Second) / (Impressions per Pod per Second)

Where:
  Impressions per Pod per Second = ~3,000 (measured benchmark)
  Peak = 2x average (standard traffic spike multiplier)

Example for 10B impressions/month:
  Average = 10B / 30 / 86400 = ~3,858 imp/sec
  Peak = 3,858 * 2 = ~7,716 imp/sec
  Required Pods = 7,716 / 3,000 = ~3 pods (min)
  With headroom (2x): 6 pods minimum
```

---

## 11. Related Documents
- [Software Requirements](software-requirements.md)
- [Deployment](deployment.md)
- [Architecture](architecture.md)
