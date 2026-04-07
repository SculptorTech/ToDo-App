// src/screens/manager/AnalyticsScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getRequest } from "../../services/apiService";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AnalyticsScreen({ navigation, route }) {
  const { user } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("week"); // week, month, quarter, year
  
  // Analytics data states
  const [taskStats, setTaskStats] = useState(null);
  const [projectStats, setProjectStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [completionRate, setCompletionRate] = useState(0);
  const [averageCompletionTime, setAverageCompletionTime] = useState(0);
  const [overdueStats, setOverdueStats] = useState(null);
  const [productivityScore, setProductivityScore] = useState(0);
  
  // Modal states
  const [selectedChart, setSelectedChart] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAllAnalytics();
    }, [user, timeRange]),
  );

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadTaskStatistics(),
        loadProjectStatistics(),
        loadEmployeePerformance(),
        loadTrendAnalysis(),
        loadProductivityMetrics(),
      ]);
      
    } catch (error) {
      console.error("Error loading analytics:", error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTaskStatistics = async () => {
    try {
      const response = await getRequest("/task/task-stats", {
        createdBy: user?.UserID,
      });
      setTaskStats(response.stats);
      
      // Calculate completion rate
      if (response.stats) {
        const total = response.stats.total || 0;
        const completed = response.stats.byStatus?.completed || 0;
        setCompletionRate(total > 0 ? Math.round((completed / total) * 100) : 0);
      }
    } catch (error) {
      console.error("Error loading task stats:", error);
    }
  };

  const loadProjectStatistics = async () => {
    try {
      const response = await getRequest("/project/get-projects", {
        createdBy: user?.UserID,
      });
      
      const projects = response.projects || [];
      
      // Calculate project stats
      const activeProjects = projects.filter(p => p.Status !== "completed").length;
      const completedProjects = projects.filter(p => p.Status === "completed").length;
      const totalBudget = projects.reduce((sum, p) => sum + (p.Budget || 0), 0);
      
      // Calculate average project progress
      const avgProgress = projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.Progress || 0), 0) / projects.length)
        : 0;
      
      setProjectStats({
        total: projects.length,
        active: activeProjects,
        completed: completedProjects,
        totalBudget,
        avgProgress,
        projects: projects.slice(0, 5), // Top 5 projects
      });
    } catch (error) {
      console.error("Error loading project stats:", error);
    }
  };

  const loadEmployeePerformance = async () => {
    try {
      // Get all tasks
      const tasksResponse = await getRequest("/task/get-tasks", {
        createdBy: user?.UserID,
      });
      
      const tasks = tasksResponse.tasks || [];
      
      // Get all users
      const usersResponse = await getRequest("/user/getusers");
      const users = usersResponse.users || [];
      
      // Calculate performance per employee
      const performance = {};
      
      tasks.forEach(task => {
        const assigneeId = task.AssignedTo;
        if (!assigneeId) return;
        
        if (!performance[assigneeId]) {
          performance[assigneeId] = {
            userId: assigneeId,
            name: task.AssignedToName || "Unknown",
            total: 0,
            completed: 0,
            inProgress: 0,
            overdue: 0,
            totalProgress: 0,
          };
        }
        
        performance[assigneeId].total++;
        performance[assigneeId].totalProgress += task.Progress || 0;
        
        if (task.Status === "completed") {
          performance[assigneeId].completed++;
        } else if (task.Status === "in_progress") {
          performance[assigneeId].inProgress++;
        }
        
        // Check overdue
        if (task.DueDate && task.Status !== "completed") {
          if (new Date(task.DueDate) < new Date()) {
            performance[assigneeId].overdue++;
          }
        }
      });
      
      // Calculate completion rate and average progress
      const performanceArray = Object.values(performance).map(emp => ({
        ...emp,
        completionRate: emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0,
        avgProgress: emp.total > 0 ? Math.round(emp.totalProgress / emp.total) : 0,
      }));
      
      // Sort by completion rate
      performanceArray.sort((a, b) => b.completionRate - a.completionRate);
      
      setEmployeeStats(performanceArray);
      
    } catch (error) {
      console.error("Error loading employee performance:", error);
    }
  };

  const loadTrendAnalysis = async () => {
    try {
      const response = await getRequest("/task/get-tasks", {
        createdBy: user?.UserID,
      });
      
      const tasks = response.tasks || [];
      
      // Group tasks by date
      const last7Days = [];
      const completedData = [];
      const createdData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayTasks = tasks.filter(t => {
          const createdAt = new Date(t.CreatedAt || t.createdAt);
          return createdAt >= date && createdAt < nextDate;
        });
        
        const completedTasks = tasks.filter(t => {
          const completedAt = t.CompletedAt || t.completedAt;
          if (!completedAt) return false;
          const compDate = new Date(completedAt);
          return compDate >= date && compDate < nextDate;
        });
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        createdData.push(dayTasks.length);
        completedData.push(completedTasks.length);
      }
      
      setTrendData({
        labels: last7Days,
        created: createdData,
        completed: completedData,
      });
      
    } catch (error) {
      console.error("Error loading trend analysis:", error);
    }
  };

  const loadProductivityMetrics = async () => {
    try {
      const tasksResponse = await getRequest("/task/get-tasks", {
        createdBy: user?.UserID,
      });
      
      const tasks = tasksResponse.tasks || [];
      
      // Calculate average completion time
      const completedTasks = tasks.filter(t => t.CompletedAt && t.CreatedAt);
      let totalDays = 0;
      
      completedTasks.forEach(task => {
        const created = new Date(task.CreatedAt);
        const completed = new Date(task.CompletedAt);
        const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
        totalDays += days;
      });
      
      const avgTime = completedTasks.length > 0 
        ? Math.round(totalDays / completedTasks.length) 
        : 0;
      setAverageCompletionTime(avgTime);
      
      // Calculate overdue statistics
      const overdue = tasks.filter(t => {
        if (!t.DueDate || t.Status === "completed") return false;
        return new Date(t.DueDate) < new Date();
      });
      
      const overdueByPriority = {
        high: overdue.filter(t => (t.Priority || "").toLowerCase() === "high").length,
        normal: overdue.filter(t => (t.Priority || "").toLowerCase() === "normal").length,
        low: overdue.filter(t => (t.Priority || "").toLowerCase() === "low").length,
      };
      
      setOverdueStats({
        total: overdue.length,
        byPriority: overdueByPriority,
      });
      
      // Calculate productivity score (0-100)
      const totalTasks = tasks.length;
      const completedCount = tasks.filter(t => t.Status === "completed").length;
      const inProgressCount = tasks.filter(t => t.Status === "in_progress").length;
      const overdueCount = overdue.length;
      
      const completionScore = totalTasks > 0 ? (completedCount / totalTasks) * 40 : 0;
      const progressScore = totalTasks > 0 ? (inProgressCount / totalTasks) * 30 : 0;
      const overduePenalty = Math.min(overdueCount * 5, 30);
      const avgProgressScore = tasks.reduce((sum, t) => sum + (t.Progress || 0), 0) / (totalTasks || 1) * 0.3;
      
      const score = Math.min(
        100,
        Math.max(0, completionScore + progressScore + avgProgressScore - overduePenalty)
      );
      
      setProductivityScore(Math.round(score));
      
    } catch (error) {
      console.error("Error calculating productivity metrics:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllAnalytics();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#43aa8b";
    if (score >= 60) return "#4cc9f0";
    if (score >= 40) return "#f8961e";
    return "#f72585";
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2599f7" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📊</Text>
          <Text style={styles.errorTitle}>Analytics Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAllAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {["week", "month", "quarter", "year"].map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeActive,
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Productivity Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Productivity Score</Text>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreValue, { color: getScoreColor(productivityScore) }]}>
              {productivityScore}
            </Text>
          </View>
          <View style={styles.scoreMetrics}>
            <View style={styles.scoreMetric}>
              <Text style={styles.scoreMetricValue}>{completionRate}%</Text>
              <Text style={styles.scoreMetricLabel}>Completion</Text>
            </View>
            <View style={styles.scoreMetric}>
              <Text style={styles.scoreMetricValue}>{averageCompletionTime}d</Text>
              <Text style={styles.scoreMetricLabel}>Avg Time</Text>
            </View>
            <View style={styles.scoreMetric}>
              <Text style={styles.scoreMetricValue}>{overdueStats?.total || 0}</Text>
              <Text style={styles.scoreMetricLabel}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* Task Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats?.total || 0}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={[styles.statCard, styles.statPending]}>
              <Text style={styles.statNumber}>{taskStats?.byStatus?.pending || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, styles.statProgress]}>
              <Text style={styles.statNumber}>{taskStats?.byStatus?.in_progress || 0}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={[styles.statCard, styles.statCompleted]}>
              <Text style={styles.statNumber}>{taskStats?.byStatus?.completed || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Priority Distribution */}
        {taskStats?.byPriority && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks by Priority</Text>
            <View style={styles.priorityContainer}>
              {Object.entries(taskStats.byPriority).map(([priority, count]) => {
                const percentage = taskStats.total > 0 
                  ? Math.round((count / taskStats.total) * 100) 
                  : 0;
                return (
                  <View key={priority} style={styles.priorityBar}>
                    <View style={styles.priorityBarHeader}>
                      <Text style={styles.priorityLabel}>{priority}</Text>
                      <Text style={styles.priorityCount}>{count} ({percentage}%)</Text>
                    </View>
                    <View style={styles.priorityBarContainer}>
                      <View
                        style={[
                          styles.priorityBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: 
                              priority === "high" ? "#f72585" :
                              priority === "normal" ? "#f8961e" : "#43aa8b"
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Trend Chart */}
        {trendData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Trend</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                <LineChart
                  data={{
                    labels: trendData.labels,
                    datasets: [
                      {
                        data: trendData.created,
                        color: (opacity = 1) => `rgba(37, 153, 247, ${opacity})`,
                        strokeWidth: 2,
                      },
                      {
                        data: trendData.completed,
                        color: (opacity = 1) => `rgba(67, 170, 139, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                    legend: ["Created", "Completed"],
                  }}
                  width={Math.max(SCREEN_WIDTH - 32, trendData.labels.length * 60)}
                  height={220}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: "#2599f7",
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            </ScrollView>
          </View>
        )}

        {/* Project Progress */}
        {projectStats && projectStats.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Progress</Text>
            <View style={styles.projectSummary}>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatNumber}>{projectStats.active}</Text>
                <Text style={styles.projectStatLabel}>Active</Text>
              </View>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatNumber}>{projectStats.completed}</Text>
                <Text style={styles.projectStatLabel}>Completed</Text>
              </View>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatNumber}>{projectStats.avgProgress}%</Text>
                <Text style={styles.projectStatLabel}>Avg Progress</Text>
              </View>
            </View>
            
            {projectStats.projects.map((project, index) => (
              <TouchableOpacity
                key={index}
                style={styles.projectItem}
                onPress={() => {
                  setSelectedChart(project);
                  setDetailsModal(true);
                }}
              >
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.Name}</Text>
                  <Text style={styles.projectStatus}>{project.Status}</Text>
                </View>
                <View style={styles.projectProgressBar}>
                  <View
                    style={[
                      styles.projectProgressFill,
                      { width: `${project.Progress || 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.projectProgressText}>{project.Progress || 0}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Employee Performance */}
        {employeeStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Performance</Text>
            {employeeStats.map((emp, index) => (
              <TouchableOpacity
                key={emp.userId}
                style={styles.employeeItem}
                onPress={() => {
                  setSelectedChart(emp);
                  setDetailsModal(true);
                }}
              >
                <View style={styles.employeeHeader}>
                  <Text style={styles.employeeName}>{emp.name}</Text>
                  <View style={styles.employeeBadge}>
                    <Text style={styles.employeeRate}>{emp.completionRate}%</Text>
                  </View>
                </View>
                
                <View style={styles.employeeStats}>
                  <View style={styles.employeeStat}>
                    <Text style={styles.employeeStatValue}>{emp.total}</Text>
                    <Text style={styles.employeeStatLabel}>Tasks</Text>
                  </View>
                  <View style={styles.employeeStat}>
                    <Text style={styles.employeeStatValue}>{emp.completed}</Text>
                    <Text style={styles.employeeStatLabel}>Done</Text>
                  </View>
                  <View style={styles.employeeStat}>
                    <Text style={styles.employeeStatValue}>{emp.overdue}</Text>
                    <Text style={styles.employeeStatLabel}>Overdue</Text>
                  </View>
                  <View style={styles.employeeStat}>
                    <Text style={styles.employeeStatValue}>{emp.avgProgress}%</Text>
                    <Text style={styles.employeeStatLabel}>Avg</Text>
                  </View>
                </View>
                
                <View style={styles.employeeProgressBar}>
                  <View
                    style={[
                      styles.employeeProgressFill,
                      { width: `${emp.completionRate}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Overdue Analysis */}
        {overdueStats && overdueStats.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overdue Analysis</Text>
            <View style={styles.overdueContainer}>
              <View style={styles.overdueTotal}>
                <Text style={styles.overdueNumber}>{overdueStats.total}</Text>
                <Text style={styles.overdueLabel}>Overdue Tasks</Text>
              </View>
              
              <View style={styles.overdueBreakdown}>
                <View style={styles.overdueItem}>
                  <View style={[styles.overdueDot, { backgroundColor: "#f72585" }]} />
                  <Text style={styles.overdueItemLabel}>High Priority</Text>
                  <Text style={styles.overdueItemValue}>{overdueStats.byPriority.high}</Text>
                </View>
                <View style={styles.overdueItem}>
                  <View style={[styles.overdueDot, { backgroundColor: "#f8961e" }]} />
                  <Text style={styles.overdueItemLabel}>Normal</Text>
                  <Text style={styles.overdueItemValue}>{overdueStats.byPriority.normal}</Text>
                </View>
                <View style={styles.overdueItem}>
                  <View style={[styles.overdueDot, { backgroundColor: "#43aa8b" }]} />
                  <Text style={styles.overdueItemLabel}>Low</Text>
                  <Text style={styles.overdueItemValue}>{overdueStats.byPriority.low}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>

      {/* Details Modal */}
      <Modal visible={detailsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Details</Text>
            {selectedChart && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetailText}>
                  {JSON.stringify(selectedChart, null, 2)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setDetailsModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6c757d",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2599f7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2599f7",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  timeRangeContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
  },
  timeRangeActive: {
    backgroundColor: "#2599f7",
  },
  timeRangeText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  timeRangeTextActive: {
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
  },
  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreTitle: {
    fontSize: 16,
    color: "#6c757d",
    marginBottom: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#2599f7",
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: "bold",
  },
  scoreMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  scoreMetric: {
    alignItems: "center",
  },
  scoreMetricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  scoreMetricLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statPending: {
    backgroundColor: "#fff3e0",
  },
  statProgress: {
    backgroundColor: "#e3f2fd",
  },
  statCompleted: {
    backgroundColor: "#e8f5e9",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  priorityContainer: {
    gap: 12,
  },
  priorityBar: {
    marginBottom: 8,
  },
  priorityBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  priorityLabel: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  priorityCount: {
    fontSize: 14,
    color: "#6c757d",
  },
  priorityBarContainer: {
    height: 8,
    backgroundColor: "#e9ecef",
    borderRadius: 4,
    overflow: "hidden",
  },
  priorityBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  projectSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  projectStat: {
    alignItems: "center",
  },
  projectStatNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2599f7",
  },
  projectStatLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  projectItem: {
    marginBottom: 12,
  },
  projectInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  projectStatus: {
    fontSize: 12,
    color: "#6c757d",
  },
  projectProgressBar: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 2,
  },
  projectProgressFill: {
    height: "100%",
    backgroundColor: "#2599f7",
    borderRadius: 3,
  },
  projectProgressText: {
    fontSize: 11,
    color: "#6c757d",
    textAlign: "right",
  },
  employeeItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  employeeBadge: {
    backgroundColor: "#2599f7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  employeeRate: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  employeeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  employeeStat: {
    alignItems: "center",
  },
  employeeStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  employeeStatLabel: {
    fontSize: 10,
    color: "#6c757d",
    marginTop: 2,
  },
  employeeProgressBar: {
    height: 4,
    backgroundColor: "#e9ecef",
    borderRadius: 2,
    overflow: "hidden",
  },
  employeeProgressFill: {
    height: "100%",
    backgroundColor: "#2599f7",
    borderRadius: 2,
  },
  overdueContainer: {
    alignItems: "center",
  },
  overdueTotal: {
    alignItems: "center",
    marginBottom: 16,
  },
  overdueNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#f72585",
  },
  overdueLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  overdueBreakdown: {
    width: "100%",
  },
  overdueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  overdueDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  overdueItemLabel: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
  },
  overdueItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  footer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  }, 
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    textAlign: "center",
  },
  modalDetails: {
    maxHeight: 400,
  },
  modalDetailText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: "#2599f7",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});