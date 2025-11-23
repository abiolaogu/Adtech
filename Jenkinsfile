#!/usr/bin/env groovy

/**
 * Jenkins CI/CD Pipeline for AdTech Platform
 *
 * Stages:
 * 1. Checkout
 * 2. Build & Test
 * 3. Security Scan
 * 4. Docker Build
 * 5. Deploy to Staging
 * 6. Integration Tests
 * 7. Deploy to Production
 * 8. Smoke Tests
 *
 * Requirements:
 * - Docker
 * - Kubernetes credentials
 * - Snyk API token
 * - SonarQube server
 */

pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:20-alpine
    command: ['cat']
    tty: true
  - name: docker
    image: docker:24-dind
    securityContext:
      privileged: true
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ['cat']
    tty: true
  - name: sonar
    image: sonarsource/sonar-scanner-cli:latest
    command: ['cat']
    tty: true
'''
        }
    }

    environment {
        DOCKER_REGISTRY = 'registry.adtech.com'
        IMAGE_NAME = 'adtech-platform'
        SONAR_HOST_URL = 'https://sonarqube.adtech.com'
        SNYK_TOKEN = credentials('snyk-api-token')
        KUBECONFIG = credentials('kubernetes-config')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BRANCH_NAME}-${env.GIT_COMMIT_SHORT}-${env.BUILD_NUMBER}"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                container('node') {
                    dir('backend') {
                        sh '''
                            npm ci
                            npm run prisma:generate
                        '''
                    }
                }
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Lint & Type Check') {
            parallel {
                stage('Backend Lint') {
                    steps {
                        container('node') {
                            dir('backend') {
                                sh 'npm run lint'
                                sh 'npm run type-check'
                            }
                        }
                    }
                }
                stage('Frontend Lint') {
                    steps {
                        container('node') {
                            dir('frontend') {
                                sh 'npm run lint'
                                sh 'npm run type-check'
                            }
                        }
                    }
                }
            }
        }

        stage('Unit Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        container('node') {
                            dir('backend') {
                                sh '''
                                    npm run test:unit -- --coverage --ci
                                '''
                            }
                        }
                    }
                    post {
                        always {
                            junit 'backend/test-results/junit.xml'
                            publishCoverage adapters: [
                                istanbulCoberturaAdapter('backend/coverage/cobertura-coverage.xml')
                            ]
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        container('node') {
                            dir('frontend') {
                                sh 'npm run test:unit -- --coverage --ci'
                            }
                        }
                    }
                    post {
                        always {
                            junit 'frontend/test-results/junit.xml'
                        }
                    }
                }
            }
        }

        stage('Security Scans') {
            parallel {
                stage('Dependency Scan - Snyk') {
                    steps {
                        container('node') {
                            script {
                                sh '''
                                    npm install -g snyk
                                    snyk auth ${SNYK_TOKEN}
                                    snyk test --severity-threshold=high || true
                                    snyk monitor
                                '''
                            }
                        }
                    }
                }

                stage('SAST - SonarQube') {
                    steps {
                        container('sonar') {
                            withSonarQubeEnv('SonarQube') {
                                sh '''
                                    sonar-scanner \
                                        -Dsonar.projectKey=adtech-platform \
                                        -Dsonar.sources=backend/src,frontend/src \
                                        -Dsonar.tests=backend/tests,frontend/tests \
                                        -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,frontend/coverage/lcov.info \
                                        -Dsonar.host.url=${SONAR_HOST_URL}
                                '''
                            }
                        }
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        container('node') {
                            sh '''
                                npm audit --audit-level=moderate
                                npm audit fix --force || true
                            '''
                        }
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Backend Image') {
                    steps {
                        container('docker') {
                            script {
                                sh """
                                    docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:${BUILD_TAG} \
                                        -t ${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:latest \
                                        -f Dockerfile .
                                """
                            }
                        }
                    }
                }
                stage('Frontend Image') {
                    steps {
                        container('docker') {
                            script {
                                sh """
                                    docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:${BUILD_TAG} \
                                        -t ${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:latest \
                                        -f frontend/Dockerfile ./frontend
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Container Security Scan') {
            steps {
                container('docker') {
                    script {
                        sh """
                            # Install Trivy
                            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add -
                            echo "deb https://aquasecurity.github.io/trivy-repo/deb \$(lsb_release -sc) main" | tee -a /etc/apt/sources.list.d/trivy.list
                            apt-get update
                            apt-get install -y trivy

                            # Scan images
                            trivy image --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:${BUILD_TAG}
                            trivy image --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:${BUILD_TAG}
                        """
                    }
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                container('docker') {
                    script {
                        docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                            sh """
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:${BUILD_TAG}
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:latest

                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:${BUILD_TAG}
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:latest
                            """
                        }
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                container('kubectl') {
                    script {
                        sh """
                            kubectl set image deployment/adtech-backend \
                                adtech-backend=${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:${BUILD_TAG} \
                                -n staging

                            kubectl set image deployment/adtech-frontend \
                                adtech-frontend=${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:${BUILD_TAG} \
                                -n staging

                            kubectl rollout status deployment/adtech-backend -n staging --timeout=5m
                            kubectl rollout status deployment/adtech-frontend -n staging --timeout=5m
                        """
                    }
                }
            }
        }

        stage('Integration Tests - Staging') {
            when {
                branch 'develop'
            }
            steps {
                container('node') {
                    dir('backend') {
                        sh '''
                            export API_URL=https://staging-api.adtech.com
                            npm run test:e2e
                        '''
                    }
                }
            }
        }

        stage('Performance Tests') {
            when {
                branch 'develop'
            }
            steps {
                container('node') {
                    sh '''
                        npm install -g artillery
                        artillery run tests/performance/load-test.yml
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 15, unit: 'MINUTES') {
                    input message: 'Deploy to Production?', ok: 'Deploy'
                }

                container('kubectl') {
                    script {
                        sh """
                            # Blue-Green Deployment
                            kubectl set image deployment/adtech-backend-green \
                                adtech-backend=${DOCKER_REGISTRY}/${IMAGE_NAME}-backend:${BUILD_TAG} \
                                -n production

                            kubectl set image deployment/adtech-frontend-green \
                                adtech-frontend=${DOCKER_REGISTRY}/${IMAGE_NAME}-frontend:${BUILD_TAG} \
                                -n production

                            kubectl rollout status deployment/adtech-backend-green -n production --timeout=10m
                            kubectl rollout status deployment/adtech-frontend-green -n production --timeout=10m

                            # Switch traffic
                            kubectl patch service adtech-backend-service -n production \
                                -p '{"spec":{"selector":{"version":"green"}}}'

                            kubectl patch service adtech-frontend-service -n production \
                                -p '{"spec":{"selector":{"version":"green"}}}'
                        """
                    }
                }
            }
        }

        stage('Smoke Tests - Production') {
            when {
                branch 'main'
            }
            steps {
                container('node') {
                    sh '''
                        export API_URL=https://api.adtech.com
                        npm run test:smoke
                    '''
                }
            }
            post {
                failure {
                    container('kubectl') {
                        // Rollback if smoke tests fail
                        sh """
                            kubectl patch service adtech-backend-service -n production \
                                -p '{"spec":{"selector":{"version":"blue"}}}'

                            kubectl patch service adtech-frontend-service -n production \
                                -p '{"spec":{"selector":{"version":"blue"}}}'
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            slackSend(
                color: 'good',
                message: "✅ Build Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
            )
        }
        failure {
            slackSend(
                color: 'danger',
                message: "❌ Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
            )
        }
    }
}
