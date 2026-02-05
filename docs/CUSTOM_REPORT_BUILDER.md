# Custom Report Builder

## Overview

The Custom Report Builder allows users to create, save, and execute custom analytics reports with flexible configuration of metrics, dimensions, filters, grouping, and sorting. Reports can be exported in multiple formats (JSON, CSV) and optionally scheduled for automated execution.

## Features

- **Flexible Report Configuration**: Select metrics, dimensions, filters, grouping, and sorting
- **Multiple Data Sources**: Campaigns, Impressions, Publishers, Audiences, Customers, Inventory
- **Date Range Presets**: Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, etc.
- **Multiple Output Formats**: JSON, CSV (PDF support planned)
- **Report Templates**: Save reports as reusable templates
- **Report Cloning**: Duplicate existing reports
- **Execution History**: Track all report executions with performance metrics
- **Scheduled Reports**: Automate report generation with cron expressions (coming soon)

## API Endpoints

### 1. Create Report

**POST** `/api/v1/reports`

Create a new custom report.

**Request Body:**
```json
{
  "name": "Campaign Performance Report",
  "description": "Monthly campaign performance metrics",
  "type": "CAMPAIGN_PERFORMANCE",
  "dataSource": "CAMPAIGNS",
  "metrics": ["impressions", "clicks", "conversions", "spent", "ctr", "cvr"],
  "dimensions": ["name", "type", "status", "advertiser"],
  "filters": {
    "status": "ACTIVE"
  },
  "groupBy": ["advertiser", "type"],
  "sortBy": [
    {
      "field": "spent",
      "order": "desc"
    }
  ],
  "dateRange": "LAST_30_DAYS",
  "format": "JSON",
  "isTemplate": false
}
```

**Response:**
```json
{
  "message": "Report created successfully",
  "report": {
    "id": "uuid",
    "name": "Campaign Performance Report",
    "userId": "uuid",
    "type": "CAMPAIGN_PERFORMANCE",
    "dataSource": "CAMPAIGNS",
    "metrics": ["impressions", "clicks", "conversions", "spent", "ctr", "cvr"],
    "dimensions": ["name", "type", "status", "advertiser"],
    "filters": {...},
    "groupBy": ["advertiser", "type"],
    "sortBy": [...],
    "dateRange": "LAST_30_DAYS",
    "format": "JSON",
    "active": true,
    "isTemplate": false,
    "createdAt": "2026-02-05T...",
    "updatedAt": "2026-02-05T..."
  }
}
```

### 2. List Reports

**GET** `/api/v1/reports`

List all reports for the authenticated user.

**Query Parameters:**
- `type` (optional): Filter by report type
- `dataSource` (optional): Filter by data source
- `isTemplate` (optional): Filter templates (true/false)

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "name": "Campaign Performance Report",
      "type": "CAMPAIGN_PERFORMANCE",
      "dataSource": "CAMPAIGNS",
      "active": true,
      "executionCount": 5,
      "lastRunAt": "2026-02-05T...",
      "createdAt": "2026-02-05T..."
    }
  ]
}
```

### 3. Get Report

**GET** `/api/v1/reports/:id`

Get a specific report with execution history.

**Response:**
```json
{
  "report": {
    "id": "uuid",
    "name": "Campaign Performance Report",
    ...full report config...,
    "executions": [
      {
        "id": "uuid",
        "status": "COMPLETED",
        "startedAt": "2026-02-05T...",
        "completedAt": "2026-02-05T...",
        "duration": 245,
        "rowCount": 42
      }
    ]
  }
}
```

### 4. Update Report

**PUT** `/api/v1/reports/:id`

Update an existing report.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Report Name",
  "metrics": ["impressions", "clicks", "spent"],
  "dimensions": ["name", "type"],
  "active": true
}
```

### 5. Delete Report

**DELETE** `/api/v1/reports/:id`

Delete a report and all its executions.

### 6. Execute Report

**POST** `/api/v1/reports/:id/execute`

Execute a report and get results.

**Query Parameters:**
- `startDate` (optional): Override report start date (ISO 8601)
- `endDate` (optional): Override report end date (ISO 8601)
- `limit` (optional): Limit number of rows returned

**Response (JSON format):**
```json
{
  "executionId": "uuid",
  "result": {
    "columns": ["name", "type", "impressions", "clicks", "spent"],
    "rows": [
      {
        "name": "Campaign A",
        "type": "DISPLAY",
        "impressions": 10000,
        "clicks": 150,
        "spent": 125.50
      }
    ],
    "summary": {
      "rowCount": 42,
      "executionTime": 245
    }
  }
}
```

**Response (CSV format):**
```csv
name,type,impressions,clicks,spent
"Campaign A","DISPLAY",10000,150,125.50
"Campaign B","VIDEO",8500,120,95.75
```

### 7. Get Execution History

**GET** `/api/v1/reports/:id/executions`

Get execution history for a report (last 50 executions).

**Response:**
```json
{
  "executions": [
    {
      "id": "uuid",
      "reportId": "uuid",
      "status": "COMPLETED",
      "startedAt": "2026-02-05T...",
      "completedAt": "2026-02-05T...",
      "duration": 245,
      "rowCount": 42,
      "error": null
    }
  ]
}
```

### 8. Get Data Source Schema

**GET** `/api/v1/reports/schema/:dataSource`

Get available metrics and dimensions for a data source.

**Response:**
```json
{
  "metrics": ["impressions", "clicks", "conversions", "spent", "ctr", "cvr", "cpm", "cpc", "cpa"],
  "dimensions": ["name", "type", "status", "objective", "advertiser", "owner", "date"]
}
```

### 9. Clone Report

**POST** `/api/v1/reports/:id/clone`

Create a copy of an existing report.

**Response:**
```json
{
  "message": "Report cloned successfully",
  "report": {
    "id": "new-uuid",
    "name": "Campaign Performance Report (Copy)",
    ...
  }
}
```

## Data Sources

### CAMPAIGNS

**Available Metrics:**
- `impressions` - Total impressions
- `clicks` - Total clicks
- `conversions` - Total conversions
- `spent` - Total spend amount
- `ctr` - Click-through rate (%)
- `cvr` - Conversion rate (%)
- `cpm` - Cost per mille (per 1000 impressions)
- `cpc` - Cost per click
- `cpa` - Cost per acquisition

**Available Dimensions:**
- `name` - Campaign name
- `type` - Campaign type (DISPLAY, VIDEO, EMAIL, NATIVE)
- `status` - Campaign status (ACTIVE, PAUSED, COMPLETED)
- `objective` - Campaign objective
- `advertiser` - Advertiser name
- `owner` - Campaign owner name
- `date` - Date created
- `startDate` - Campaign start date
- `endDate` - Campaign end date

### IMPRESSIONS

**Available Metrics:**
- `revenue` - Total revenue
- `publisherRevenue` - Publisher revenue share

**Available Dimensions:**
- `campaign` - Campaign name
- `advertiser` - Advertiser name
- `publisher` - Publisher name
- `placement` - Placement name
- `served` - Whether ad was served (boolean)
- `viewed` - Whether ad was viewed (boolean)
- `clicked` - Whether ad was clicked (boolean)
- `converted` - Whether ad converted (boolean)
- `date` - Date (YYYY-MM-DD)
- `hour` - Hour of day (0-23)
- `dayOfWeek` - Day of week name

### PUBLISHERS

**Available Metrics:**
- `impressions` - Total impressions
- `revenue` - Total revenue
- `avgCpm` - Average CPM
- `inventoryCount` - Number of inventories
- `placementCount` - Number of placements

**Available Dimensions:**
- `name` - Publisher name
- `domain` - Publisher domain
- `status` - Publisher status
- `revenueShare` - Revenue share percentage

### AUDIENCES

**Available Metrics:**
- `size` - Audience size
- `memberCount` - Number of members
- `campaignCount` - Number of campaigns using this audience

**Available Dimensions:**
- `name` - Audience name
- `status` - Audience status
- `owner` - Audience owner name

### CUSTOMERS

**Available Metrics:**
- `eventCount` - Number of events
- `segmentCount` - Number of segments customer belongs to

**Available Dimensions:**
- `email` - Customer email
- `firstName` - First name
- `lastName` - Last name
- `country` - Country
- `city` - City
- `emailConsent` - Email consent (boolean)
- `smsConsent` - SMS consent (boolean)

### INVENTORY

**Available Metrics:**
- `totalSlots` - Total slots
- `availableSlots` - Available slots
- `utilization` - Utilization percentage
- `floorPrice` - Floor price
- `slotCount` - Number of slots
- `campaignCount` - Number of campaigns

**Available Dimensions:**
- `name` - Inventory name
- `type` - Inventory type (EMAIL, MOVIE, VIDEO, DISPLAY, NATIVE)
- `publisher` - Publisher name
- `status` - Inventory status
- `currency` - Currency code

## Date Range Presets

- `CUSTOM` - Use custom startDate and endDate
- `TODAY` - Today's data
- `YESTERDAY` - Yesterday's data
- `LAST_7_DAYS` - Last 7 days
- `LAST_30_DAYS` - Last 30 days
- `THIS_MONTH` - Current month to date
- `LAST_MONTH` - Previous month
- `THIS_YEAR` - Current year to date
- `LAST_YEAR` - Previous year

## Report Types

- `CAMPAIGN_PERFORMANCE` - Campaign performance metrics
- `INVENTORY_UTILIZATION` - Inventory usage and availability
- `REVENUE` - Revenue analysis
- `AUDIENCE_INSIGHTS` - Audience analytics
- `CUSTOM` - Custom report with flexible configuration

## Output Formats

- `JSON` - JSON format (default)
- `CSV` - Comma-separated values
- `PDF` - PDF format (coming soon)

## Examples

### Example 1: Top Performing Campaigns

```json
{
  "name": "Top 10 Campaigns by Revenue",
  "dataSource": "CAMPAIGNS",
  "metrics": ["impressions", "clicks", "spent", "ctr", "cvr"],
  "dimensions": ["name", "advertiser"],
  "dateRange": "LAST_30_DAYS",
  "sortBy": [{"field": "spent", "order": "desc"}],
  "format": "JSON"
}
```

### Example 2: Publisher Revenue Report

```json
{
  "name": "Publisher Revenue Breakdown",
  "dataSource": "PUBLISHERS",
  "metrics": ["impressions", "revenue", "avgCpm"],
  "dimensions": ["name", "domain"],
  "dateRange": "THIS_MONTH",
  "sortBy": [{"field": "revenue", "order": "desc"}],
  "format": "CSV"
}
```

### Example 3: Daily Impression Trends

```json
{
  "name": "Daily Impression Trends",
  "dataSource": "IMPRESSIONS",
  "metrics": ["revenue", "publisherRevenue"],
  "dimensions": ["date", "campaign"],
  "dateRange": "LAST_7_DAYS",
  "groupBy": ["date"],
  "sortBy": [{"field": "date", "order": "asc"}],
  "format": "JSON"
}
```

### Example 4: Audience Engagement Report

```json
{
  "name": "Audience Engagement Analysis",
  "dataSource": "CUSTOMERS",
  "metrics": ["eventCount"],
  "dimensions": ["country", "city"],
  "filters": {
    "emailConsent": true
  },
  "dateRange": "LAST_30_DAYS",
  "groupBy": ["country"],
  "sortBy": [{"field": "eventCount", "order": "desc"}],
  "format": "JSON"
}
```

## Best Practices

1. **Use appropriate data sources**: Match your data source to your reporting needs
2. **Limit row counts**: For large datasets, use the `limit` query parameter
3. **Use templates**: Create templates for frequently used reports
4. **Group data wisely**: Group by dimensions to reduce row count and improve performance
5. **Apply filters**: Filter data to reduce processing time
6. **Choose the right format**: Use CSV for large exports, JSON for interactive data

## Performance Considerations

- Report execution time depends on data volume and complexity
- Typical execution times:
  - Simple reports (< 1000 rows): < 500ms
  - Medium reports (1000-10000 rows): 500ms - 2s
  - Large reports (> 10000 rows): 2s - 10s
- Use filters and limits to improve performance
- Consider using scheduled reports for large datasets

## Future Enhancements

- ✅ Basic custom report builder (v3.1)
- 🚧 Scheduled reports with email delivery
- 🚧 PDF export format
- 🚧 Chart/visualization presets
- 🚧 Report sharing and permissions
- 🚧 Advanced aggregations (percentiles, standard deviation)
- 🚧 Cross-data-source joins
- 🚧 Real-time report streaming
