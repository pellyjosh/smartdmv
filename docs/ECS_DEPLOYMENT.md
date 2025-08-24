# AWS ECS Deployment Guide - Complete Solution

Deploy both your Next.js server and WebSocket server on AWS ECS for a unified, scalable production setup.

## Why ECS for Both Services?

✅ **Unified Infrastructure**: Both services on the same platform
✅ **Full Server Capabilities**: No limitations like Amplify's static hosting
✅ **Auto Scaling**: Scale both services based on demand
✅ **Load Balancing**: Distribute traffic across multiple instances
✅ **Container Management**: Consistent deployment process
✅ **Cost Effective**: Pay only for compute resources used

## Architecture Overview

```
Internet Gateway
    ↓
Application Load Balancer
    ↓
┌─────────────────┬─────────────────┐
│   Next.js App   │ WebSocket Server │
│   (Port 3000)   │   (Port 8080)   │
│   ECS Service   │   ECS Service   │
└─────────────────┴─────────────────┘
    ↓
RDS PostgreSQL Database
```

## Prerequisites

- AWS CLI configured (`aws configure`)
- Docker installed locally
- Your RDS PostgreSQL database running

## Step 1: Create Dockerfiles

### Dockerfile for Next.js App

Create `Dockerfile.nextjs`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Dockerfile for WebSocket Server

Create `Dockerfile.websocket`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S websocket -u 1001

# Change ownership
RUN chown -R websocket:nodejs /app
USER websocket

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('WebSocket server health check')" || exit 1

CMD ["npm", "run", "ws"]
```

## Step 2: Configure Next.js for Standalone Mode

Update your `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone mode for Docker deployment
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
```

## Step 3: Create ECR Repositories

```bash
# Create repositories for both services
aws ecr create-repository --repository-name smartdmv-nextjs --region us-east-1
aws ecr create-repository --repository-name smartdmv-websocket --region us-east-1
```

## Step 4: Build and Push Images

### Build Script

Create `build-and-push.sh`:

```bash
#!/bin/bash

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ECR URIs
NEXTJS_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smartdmv-nextjs"
WEBSOCKET_ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smartdmv-websocket"

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push Next.js app
echo "Building Next.js app..."
docker build -f Dockerfile.nextjs -t smartdmv-nextjs .
docker tag smartdmv-nextjs:latest $NEXTJS_ECR_URI:latest
docker push $NEXTJS_ECR_URI:latest

# Build and push WebSocket server
echo "Building WebSocket server..."
docker build -f Dockerfile.websocket -t smartdmv-websocket .
docker tag smartdmv-websocket:latest $WEBSOCKET_ECR_URI:latest
docker push $WEBSOCKET_ECR_URI:latest

echo "✅ Both images pushed successfully!"
echo "Next.js ECR URI: $NEXTJS_ECR_URI:latest"
echo "WebSocket ECR URI: $WEBSOCKET_ECR_URI:latest"
```

Make it executable and run:

```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

## Step 5: Create ECS Infrastructure

### Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name smartdmv-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### Create Task Definitions

#### Next.js Task Definition (`nextjs-task-definition.json`):

```json
{
  "family": "smartdmv-nextjs",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "nextjs-container",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartdmv-nextjs:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "POSTGRES_URL",
          "value": "postgresql://smartdvm:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm?sslmode=require"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/smartdmv-nextjs",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### WebSocket Task Definition (`websocket-task-definition.json`):

```json
{
  "family": "smartdmv-websocket",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "websocket-container",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartdmv-websocket:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "POSTGRES_URL",
          "value": "postgresql://smartdvm:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm?sslmode=require"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/smartdmv-websocket",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Register Task Definitions

```bash
# Create CloudWatch log groups first
aws logs create-log-group --log-group-name /ecs/smartdmv-nextjs
aws logs create-log-group --log-group-name /ecs/smartdmv-websocket

# Register task definitions
aws ecs register-task-definition --cli-input-json file://nextjs-task-definition.json
aws ecs register-task-definition --cli-input-json file://websocket-task-definition.json
```

## Step 6: Create Application Load Balancer

### Create ALB

```bash
# Create security group for ALB
aws ec2 create-security-group \
  --group-name smartdmv-alb-sg \
  --description "Security group for SmartDMV ALB"

# Add rules to allow HTTP/HTTPS traffic
aws ec2 authorize-security-group-ingress \
  --group-name smartdmv-alb-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name smartdmv-alb-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create ALB (replace subnet IDs with your VPC subnets)
aws elbv2 create-load-balancer \
  --name smartdmv-alb \
  --subnets subnet-12345678 subnet-87654321 \
  --security-groups sg-12345678
```

### Create Target Groups

```bash
# Target group for Next.js app
aws elbv2 create-target-group \
  --name smartdmv-nextjs-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-12345678 \
  --target-type ip \
  --health-check-path /api/health

# Target group for WebSocket server
aws elbv2 create-target-group \
  --name smartdmv-websocket-tg \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-12345678 \
  --target-type ip \
  --health-check-path /health
```

## Step 7: Create ECS Services

### Create Security Groups for ECS Tasks

```bash
# Security group for ECS tasks
aws ec2 create-security-group \
  --group-name smartdmv-ecs-sg \
  --description "Security group for SmartDMV ECS tasks"

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-name smartdmv-ecs-sg \
  --protocol tcp \
  --port 3000 \
  --source-group sg-ALB_SECURITY_GROUP_ID

aws ec2 authorize-security-group-ingress \
  --group-name smartdmv-ecs-sg \
  --protocol tcp \
  --port 8080 \
  --source-group sg-ALB_SECURITY_GROUP_ID
```

### Create ECS Services

```bash
# Create Next.js service
aws ecs create-service \
  --cluster smartdmv-cluster \
  --service-name smartdmv-nextjs-service \
  --task-definition smartdmv-nextjs \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678,subnet-87654321],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/smartdmv-nextjs-tg/1234567890123456,containerName=nextjs-container,containerPort=3000"

# Create WebSocket service
aws ecs create-service \
  --cluster smartdmv-cluster \
  --service-name smartdmv-websocket-service \
  --task-definition smartdmv-websocket \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678,subnet-87654321],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/smartdmv-websocket-tg/1234567890123456,containerName=websocket-container,containerPort=8080"
```

## Step 8: Configure Load Balancer Routing

Create listener rules to route traffic:

- **Next.js App**: Default rule (all traffic to port 80/443)
- **WebSocket**: Route `/ws/*` or `Host: ws.yourdomain.com`

## Step 9: Domain and SSL

1. **Request SSL Certificate** in AWS Certificate Manager
2. **Create Route 53 records**:
   - `yourdomain.com` → ALB (Next.js app)
   - `ws.yourdomain.com` → ALB (WebSocket server)
3. **Add HTTPS listener** to ALB with SSL certificate

## Step 10: Auto Scaling

Configure auto-scaling for both services based on CPU/memory usage:

```bash
# Create auto-scaling targets
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/smartdmv-cluster/smartdmv-nextjs-service \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/smartdmv-cluster/smartdmv-websocket-service \
  --min-capacity 1 \
  --max-capacity 5
```

## Benefits of This ECS Setup

✅ **High Availability**: Multiple AZs with auto-scaling
✅ **Load Distribution**: ALB distributes traffic across instances
✅ **Health Monitoring**: Automatic health checks and replacement
✅ **Zero Downtime Deployments**: Rolling updates
✅ **Cost Optimization**: Scale down during low traffic
✅ **Centralized Logging**: CloudWatch logs for both services
✅ **Security**: VPC isolation and security groups

## Monitoring and Maintenance

- **CloudWatch Dashboards**: Monitor CPU, memory, and request metrics
- **CloudWatch Alarms**: Alert on high resource usage
- **ECS Service Updates**: Deploy new versions with rolling updates
- **Log Analysis**: Use CloudWatch Insights for log analysis

## Cost Estimation

For a typical setup:

- **2 Next.js tasks (512 CPU, 1024 MB)**: ~$35/month
- **1 WebSocket task (256 CPU, 512 MB)**: ~$9/month
- **Application Load Balancer**: ~$18/month
- **Total**: ~$62/month (plus data transfer costs)

This is much more cost-effective than Amplify for server-side rendered applications!
