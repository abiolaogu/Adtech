import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  RefreshControl
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Feather';
import PushNotification from 'react-native-push-notification';

/**
 * AdTech Platform - Admin Mobile App
 *
 * Features:
 * - Real-time platform monitoring
 * - Campaign performance dashboard
 * - Quick campaign approval
 * - Revenue analytics
 * - User management
 * - Push notifications for alerts
 * - Offline support
 *
 * Tech Stack:
 * - React Native
 * - TypeScript
 * - React Native Chart Kit
 * - Push Notifications
 * - AsyncStorage for offline data
 */

const { width } = Dimensions.get('window');

interface DashboardMetrics {
  totalRevenue: number;
  revenueChange: number;
  activeAdvertisers: number;
  advertiserChange: number;
  activePublishers: number;
  publisherChange: number;
  totalImpressions: number;
  impressionsChange: number;
  avgCPM: number;
  cpmChange: number;
  fillRate: number;
  fillRateChange: number;
}

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  status: 'pending' | 'active' | 'paused';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roi: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'alerts' | 'settings'>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 1284500,
    revenueChange: 12.5,
    activeAdvertisers: 1247,
    advertiserChange: 8.3,
    activePublishers: 3891,
    publisherChange: 5.7,
    totalImpressions: 125400000,
    impressionsChange: 15.2,
    avgCPM: 4.85,
    cpmChange: -2.3,
    fillRate: 98.2,
    fillRateChange: 1.2
  });

  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([
    {
      id: 'camp_001',
      name: 'Summer Sale 2024',
      advertiser: 'Nike',
      status: 'pending',
      budget: 50000,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      roi: 0
    },
    {
      id: 'camp_002',
      name: 'Black Friday Campaign',
      advertiser: 'Amazon',
      status: 'pending',
      budget: 150000,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      roi: 0
    }
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert_001',
      type: 'warning',
      title: 'High Fraud Rate Detected',
      message: 'Campaign ID 4512 showing 15% fraud rate. Review recommended.',
      timestamp: new Date(),
      read: false
    },
    {
      id: 'alert_002',
      type: 'info',
      title: 'New Campaign Approval',
      message: '2 campaigns pending your approval',
      timestamp: new Date(),
      read: false
    }
  ]);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Configure push notifications
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true
      },
      popInitialNotification: true,
      requestPermissions: true
    });

    // Fetch initial data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // TODO: Call real API
    // For now, simulating data
    setRefreshing(true);

    setTimeout(() => {
      // Simulate data update
      setMetrics(prev => ({
        ...prev,
        totalRevenue: prev.totalRevenue + Math.random() * 1000
      }));
      setRefreshing(false);
    }, 1500);
  };

  const approveCampaign = async (campaignId: string) => {
    setPendingCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === campaignId ? { ...campaign, status: 'active' as const } : campaign
      )
    );

    // Send push notification
    PushNotification.localNotification({
      title: 'Campaign Approved',
      message: 'Campaign has been successfully activated',
      playSound: true,
      soundName: 'default'
    });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  /**
   * Dashboard Tab
   */
  const DashboardTab = () => {
    // Revenue chart data (last 7 days)
    const revenueChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          data: [182000, 195000, 188000, 205000, 198000, 210000, 215000]
        }
      ]
    };

    // Revenue by channel
    const channelData = [
      { name: 'Display', revenue: 580000, color: '#3B82F6', legendFontColor: '#374151' },
      { name: 'Video', revenue: 420000, color: '#8B5CF6', legendFontColor: '#374151' },
      { name: 'Native', revenue: 180000, color: '#10B981', legendFontColor: '#374151' },
      { name: 'Audio', revenue: 104500, color: '#F59E0B', legendFontColor: '#374151' }
    ];

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} />
        }
      >
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="dollar-sign"
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            change={metrics.revenueChange}
            color="#10B981"
          />
          <MetricCard
            icon="users"
            title="Advertisers"
            value={formatNumber(metrics.activeAdvertisers)}
            change={metrics.advertiserChange}
            color="#3B82F6"
          />
          <MetricCard
            icon="globe"
            title="Publishers"
            value={formatNumber(metrics.activePublishers)}
            change={metrics.publisherChange}
            color="#8B5CF6"
          />
          <MetricCard
            icon="eye"
            title="Impressions"
            value={formatNumber(metrics.totalImpressions)}
            change={metrics.impressionsChange}
            color="#F59E0B"
          />
          <MetricCard
            icon="trending-up"
            title="Avg CPM"
            value={`$${metrics.avgCPM}`}
            change={metrics.cpmChange}
            color="#EF4444"
          />
          <MetricCard
            icon="percent"
            title="Fill Rate"
            value={`${metrics.fillRate}%`}
            change={metrics.fillRateChange}
            color="#06B6D4"
          />
        </View>

        {/* Revenue Trend Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue Trend (Last 7 Days)</Text>
          <LineChart
            data={revenueChartData}
            width={width - 48}
            height={200}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#3B82F6'
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Revenue by Channel */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Revenue by Channel</Text>
          <PieChart
            data={channelData}
            width={width - 48}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
            }}
            accessor="revenue"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </ScrollView>
    );
  };

  /**
   * Campaigns Tab
   */
  const CampaignsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Approval ({pendingCampaigns.filter(c => c.status === 'pending').length})</Text>
      </View>

      {pendingCampaigns
        .filter(campaign => campaign.status === 'pending')
        .map(campaign => (
          <View key={campaign.id} style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <View>
                <Text style={styles.campaignName}>{campaign.name}</Text>
                <Text style={styles.campaignAdvertiser}>{campaign.advertiser}</Text>
              </View>
              <View style={[styles.statusBadge, styles.statusPending]}>
                <Text style={styles.statusText}>Pending</Text>
              </View>
            </View>

            <View style={styles.campaignMetrics}>
              <View style={styles.campaignMetricItem}>
                <Text style={styles.metricLabel}>Budget</Text>
                <Text style={styles.metricValue}>{formatCurrency(campaign.budget)}</Text>
              </View>
              <View style={styles.campaignMetricItem}>
                <Text style={styles.metricLabel}>Duration</Text>
                <Text style={styles.metricValue}>30 days</Text>
              </View>
            </View>

            <View style={styles.campaignActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => approveCampaign(campaign.id)}
              >
                <Icon name="check" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.rejectButton]}>
                <Icon name="x" size={16} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.reviewButton]}>
                <Icon name="eye" size={16} color="#3B82F6" />
                <Text style={[styles.actionButtonText, styles.reviewButtonText]}>Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
    </ScrollView>
  );

  /**
   * Alerts Tab
   */
  const AlertsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Alerts ({alerts.filter(a => !a.read).length})</Text>
      </View>

      {alerts.map(alert => (
        <View key={alert.id} style={[styles.alertCard, !alert.read && styles.alertUnread]}>
          <View style={styles.alertHeader}>
            <Icon
              name={
                alert.type === 'error'
                  ? 'alert-circle'
                  : alert.type === 'warning'
                  ? 'alert-triangle'
                  : alert.type === 'success'
                  ? 'check-circle'
                  : 'info'
              }
              size={20}
              color={
                alert.type === 'error'
                  ? '#EF4444'
                  : alert.type === 'warning'
                  ? '#F59E0B'
                  : alert.type === 'success'
                  ? '#10B981'
                  : '#3B82F6'
              }
            />
            <Text style={styles.alertTitle}>{alert.title}</Text>
          </View>
          <Text style={styles.alertMessage}>{alert.message}</Text>
          <Text style={styles.alertTime}>
            {alert.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  /**
   * Metric Card Component
   */
  const MetricCard: React.FC<{
    icon: string;
    title: string;
    value: string;
    change: number;
    color: string;
  }> = ({ icon, title, value, change, color }) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.metricChange}>
        <Icon
          name={change >= 0 ? 'trending-up' : 'trending-down'}
          size={12}
          color={change >= 0 ? '#10B981' : '#EF4444'}
        />
        <Text style={[styles.changeText, { color: change >= 0 ? '#10B981' : '#EF4444' }]}>
          {Math.abs(change)}%
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AdTech Platform</Text>
          <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.notificationIcon}>
          <Icon name="bell" size={24} color="#374151" />
          {alerts.filter(a => !a.read).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {alerts.filter(a => !a.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'alerts' && <AlertsTab />}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('dashboard')}
        >
          <Icon
            name="home"
            size={24}
            color={activeTab === 'dashboard' ? '#3B82F6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'dashboard' && styles.navLabelActive
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('campaigns')}
        >
          <Icon
            name="target"
            size={24}
            color={activeTab === 'campaigns' ? '#3B82F6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'campaigns' && styles.navLabelActive
            ]}
          >
            Campaigns
          </Text>
          {pendingCampaigns.filter(c => c.status === 'pending').length > 0 && (
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>
                {pendingCampaigns.filter(c => c.status === 'pending').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('alerts')}
        >
          <Icon
            name="alert-circle"
            size={24}
            color={activeTab === 'alerts' ? '#3B82F6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'alerts' && styles.navLabelActive
            ]}
          >
            Alerts
          </Text>
          {alerts.filter(a => !a.read).length > 0 && (
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>
                {alerts.filter(a => !a.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('settings')}
        >
          <Icon
            name="settings"
            size={24}
            color={activeTab === 'settings' ? '#3B82F6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'settings' && styles.navLabelActive
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  notificationIcon: {
    position: 'relative'
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  tabContent: {
    flex: 1,
    padding: 16
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    width: (width - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  metricTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  campaignAdvertiser: {
    fontSize: 14,
    color: '#6B7280'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusPending: {
    backgroundColor: '#FEF3C7'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706'
  },
  campaignMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  campaignMetricItem: {
    flex: 1
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  campaignActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4
  },
  approveButton: {
    backgroundColor: '#10B981'
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444'
  },
  reviewButton: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6
  },
  rejectButtonText: {
    color: '#EF4444'
  },
  reviewButtonText: {
    color: '#3B82F6'
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  alertUnread: {
    backgroundColor: '#EFF6FF'
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
    flex: 1
  },
  alertMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 20,
    paddingTop: 12
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative'
  },
  navLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4
  },
  navLabelActive: {
    color: '#3B82F6',
    fontWeight: '600'
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: '30%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  }
});
