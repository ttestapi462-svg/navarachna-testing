@description('Location for all resources')
param location string = resourceGroup().location

@description('Unique suffix for resource names')
param environmentName string = 'navarachna'

@description('PostgreSQL Administrator Login')
param dbAdminLogin string = 'studioadmin'

@secure()
@description('PostgreSQL Administrator Password')
param dbAdminPassword string

// 1. Azure Log Analytics Workspace (Required for Container Apps)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${environmentName}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// 2. Azure Container Apps Managed Environment (Consumption / Serverless)
resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${environmentName}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// 3. Azure Database for PostgreSQL Flexible Server (Burstable B1ms - Minimal Cost)
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: 'psql-${environmentName}'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// 4. Backend API Container App (.NET 10, scale-to-zero)
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'api-${environmentName}'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: false // Internal only; accessed via Next.js proxy
        targetPort: 5000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'api'
          image: 'mcr.microsoft.com/dotnet/samples:aspnetapp' // Replace with your ACR image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0 // Scale to 0 when idle ($0 compute)
        maxReplicas: 2
      }
    }
  }
}

// 5. Web Frontend Container App (Next.js 16 standalone, scale-to-zero)
resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'web-${environmentName}'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true // Public web portal
        targetPort: 3000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'web'
          image: 'mcr.microsoft.com/azuredocs/aci-helloworld:latest' // Replace with your ACR image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            },
            {
              name: 'INTERNAL_API_URL'
              value: 'http://api-${environmentName}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0 // Scale to 0 when idle ($0 compute)
        maxReplicas: 2
      }
    }
  }
}

output webFqdn string = webApp.properties.configuration.ingress.fqdn
