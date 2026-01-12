import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/campaign_card.dart';

class AdvertiserHome extends StatefulWidget {
  const AdvertiserHome({super.key});

  @override
  State<AdvertiserHome> createState() => _AdvertiserHomeState();
}

class _AdvertiserHomeState extends State<AdvertiserHome> {
  int _selectedIndex = 0;
  bool _isLoading = true;
  Map<String, dynamic> _metrics = {};

  @override
  void initState() {
    super.initState();
    _loadMetrics();
  }

  Future<void> _loadMetrics() async {
    setState(() => _isLoading = true);
    // TODO: Load from API
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _metrics = {
        'impressions': 2500000,
        'clicks': 50000,
        'conversions': 1250,
        'spent': 12500,
        'ctr': 2.0,
        'cvr': 2.5,
        'impressionsChange': 15.2,
        'clicksChange': 22.4,
        'conversionsChange': 8.7,
        'spentChange': 10.3,
      };
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Advertiser Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // Show notifications
            },
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () {
              // Show profile menu
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildContent(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.campaign_outlined),
            activeIcon: Icon(Icons.campaign),
            label: 'Campaigns',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.insert_photo_outlined),
            activeIcon: Icon(Icons.insert_photo),
            label: 'Creatives',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics_outlined),
            activeIcon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.account_balance_wallet_outlined),
            activeIcon: Icon(Icons.account_balance_wallet),
            label: 'Billing',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // Create new campaign
        },
        icon: const Icon(Icons.add),
        label: const Text('New Campaign'),
      ),
    );
  }

  Widget _buildContent() {
    switch (_selectedIndex) {
      case 0:
        return _buildDashboard();
      case 1:
        return _buildCampaigns();
      case 2:
        return _buildCreatives();
      case 3:
        return _buildAnalytics();
      case 4:
        return _buildBilling();
      default:
        return _buildDashboard();
    }
  }

  Widget _buildDashboard() {
    return RefreshIndicator(
      onRefresh: _loadMetrics,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Time Range Selector
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 20),
                    const SizedBox(width: 8),
                    const Text('Last 30 Days', style: TextStyle(fontWeight: FontWeight.w500)),
                    const Spacer(),
                    TextButton(
                      onPressed: () {
                        // Show date picker
                      },
                      child: const Text('Change'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Metric Cards
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: 'Impressions',
                    value: NumberFormat.compact().format(_metrics['impressions']),
                    change: _metrics['impressionsChange'],
                    icon: Icons.visibility,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: 'Clicks',
                    value: NumberFormat.compact().format(_metrics['clicks']),
                    change: _metrics['clicksChange'],
                    icon: Icons.touch_app,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: 'Conversions',
                    value: NumberFormat.compact().format(_metrics['conversions']),
                    change: _metrics['conversionsChange'],
                    icon: Icons.check_circle,
                    color: Colors.purple,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: 'Spent',
                    value: '\$${NumberFormat.compact().format(_metrics['spent'])}',
                    change: _metrics['spentChange'],
                    icon: Icons.attach_money,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Performance Chart
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Performance Trend',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 200,
                      child: LineChart(
                        LineChartData(
                          gridData: FlGridData(show: true, drawVerticalLine: false),
                          titlesData: FlTitlesData(
                            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
                            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true)),
                            rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          ),
                          borderData: FlBorderData(show: false),
                          lineBarsData: [
                            LineChartBarData(
                              spots: _generateSpots(),
                              isCurved: true,
                              color: Colors.blue,
                              barWidth: 3,
                              dotData: FlDotData(show: false),
                              belowBarData: BarAreaData(
                                show: true,
                                color: Colors.blue.withOpacity(0.1),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Active Campaigns
            const Text(
              'Active Campaigns',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ..._buildCampaignList(),
          ],
        ),
      ),
    );
  }

  List<FlSpot> _generateSpots() {
    return List.generate(7, (index) {
      return FlSpot(index.toDouble(), (index * 1000 + 2000).toDouble());
    });
  }

  List<Widget> _buildCampaignList() {
    return [
      CampaignCard(
        name: 'Summer Sale 2025',
        status: 'Active',
        budget: 5000,
        spent: 2340,
        ctr: 2.1,
        performance: 15.2,
      ),
      const SizedBox(height: 12),
      CampaignCard(
        name: 'Brand Awareness Q4',
        status: 'Active',
        budget: 3000,
        spent: 876,
        ctr: 1.8,
        performance: 8.5,
      ),
      const SizedBox(height: 12),
      CampaignCard(
        name: 'Product Launch',
        status: 'Active',
        budget: 8000,
        spent: 4200,
        ctr: 3.2,
        performance: 22.3,
      ),
    ];
  }

  Widget _buildCampaigns() {
    return const Center(child: Text('Campaigns Screen'));
  }

  Widget _buildCreatives() {
    return const Center(child: Text('Creatives Screen'));
  }

  Widget _buildAnalytics() {
    return const Center(child: Text('Analytics Screen'));
  }

  Widget _buildBilling() {
    return const Center(child: Text('Billing Screen'));
  }
}
