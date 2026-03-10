// src/screens/admin/AnalyticsScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getProjects, getTasks, getTeams, getUsers } from "../../utils/storage";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overview: {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalUsers: 0,
      activeUsers: 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      averageCompletion: 0,
    },
    projectStats: [],
    userStats: {
      byRole: [],
      byStatus: [],
    },
    taskStats: {
      byPriority: [],
      byStatus: [],
    },
    timelineData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      tasksCreated: [0, 0, 0, 0, 0, 0, 0],
      tasksCompleted: [0, 0, 0, 0, 0, 0, 0],
    },
  });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const projects = (await getProjects()) || [];
      const users = (await getUsers()) || [];
      const tasks = (await getTasks()) || [];
      const teams = (await getTeams()) || [];

      // Calculate overview stats
      const activeProjects = projects.filter(
        (p) => p.status?.toLowerCase() === "active",
      ).length;
      const completedProjects = projects.filter(
        (p) => p.status?.toLowerCase() === "completed",
      ).length;
      const activeUsers = users.filter(
        (u) => u.status?.toLowerCase() === "active",
      ).length;
      const completedTasks = tasks.filter(
        (t) => t.status?.toLowerCase() === "completed",
      ).length;
      const pendingTasks = tasks.filter(
        (t) => t.status?.toLowerCase() !== "completed",
      ).length;

      // Calculate average project completion
      const totalProgress = projects.reduce(
        (acc, p) => acc + (p.progress || 0),
        0,
      );
      const avgCompletion =
        projects.length > 0 ? Math.round(totalProgress / projects.length) : 0;

      // Process project stats
      const projectStats = projects.slice(0, 5).map((p) => ({
        name: p.name || "Unnamed Project",
        progress: p.progress || 0,
        tasks: p.tasks?.length || 0,
        completed: p.completedTasks || 0,
        team: p.members?.length || 0,
      }));

      // Process user stats by role
      const roleCounts = {};
      users.forEach((user) => {
        const role = user.role || "Unassigned";
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });

      const roleColors = {
        admin: "#4361ee",
        manager: "#f72585",
        team_lead: "#4cc9f0",
        developer: "#f8961e",
        viewer: "#43aa8b",
      };

      const byRole = Object.entries(roleCounts).map(([role, count]) => ({
        role: role
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        count,
        color: roleColors[role.toLowerCase()] || "#6c757d",
      }));

      // Process user stats by status
      const statusCounts = {
        active: users.filter((u) => u.status?.toLowerCase() === "active")
          .length,
        inactive: users.filter((u) => u.status?.toLowerCase() === "inactive")
          .length,
      };

      const byStatus = [
        { status: "Active", count: statusCounts.active, color: "#43aa8b" },
        { status: "Inactive", count: statusCounts.inactive, color: "#f72585" },
      ];

      // Process task stats by priority
      const priorityCounts = {
        high: tasks.filter((t) => t.priority?.toLowerCase() === "high").length,
        medium: tasks.filter((t) => t.priority?.toLowerCase() === "medium")
          .length,
        low: tasks.filter((t) => t.priority?.toLowerCase() === "low").length,
      };

      const byPriority = [
        { priority: "High", count: priorityCounts.high, color: "#f72585" },
        { priority: "Medium", count: priorityCounts.medium, color: "#f8961e" },
        { priority: "Low", count: priorityCounts.low, color: "#43aa8b" },
      ];

      // Process task stats by status
      const taskStatusCounts = {
        pending: tasks.filter((t) => t.status?.toLowerCase() === "pending")
          .length,
        inProgress: tasks.filter(
          (t) =>
            t.status?.toLowerCase() === "inprogress" ||
            t.status?.toLowerCase() === "in-progress",
        ).length,
        completed: tasks.filter((t) => t.status?.toLowerCase() === "completed")
          .length,
      };

      const byTaskStatus = [
        {
          status: "Pending",
          count: taskStatusCounts.pending,
          color: "#6c757d",
        },
        {
          status: "In Progress",
          count: taskStatusCounts.inProgress,
          color: "#4cc9f0",
        },
        {
          status: "Completed",
          count: taskStatusCounts.completed,
          color: "#43aa8b",
        },
      ];

      // Generate timeline data from tasks
      const today = new Date();
      const weekData = Array(7)
        .fill(0)
        .map(() => ({ created: 0, completed: 0 }));

      tasks.forEach((task) => {
        if (task.createdAt) {
          const createdDate = new Date(task.createdAt);
          const dayDiff = Math.floor(
            (today - createdDate) / (1000 * 60 * 60 * 24),
          );
          if (dayDiff >= 0 && dayDiff < 7) {
            weekData[6 - dayDiff].created++;
          }
        }

        if (task.completedAt) {
          const completedDate = new Date(task.completedAt);
          const dayDiff = Math.floor(
            (today - completedDate) / (1000 * 60 * 60 * 24),
          );
          if (dayDiff >= 0 && dayDiff < 7) {
            weekData[6 - dayDiff].completed++;
          }
        }
      });

      setAnalytics({
        overview: {
          totalProjects: projects.length,
          activeProjects,
          completedProjects,
          totalUsers: users.length,
          activeUsers,
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          averageCompletion: avgCompletion,
        },
        projectStats,
        userStats: {
          byRole,
          byStatus,
        },
        taskStats: {
          byPriority,
          byStatus: byTaskStatus,
        },
        timelineData: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          tasksCreated: weekData.map((d) => d.created),
          tasksCompleted: weekData.map((d) => d.completed),
        },
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      Alert.alert("Error", "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, []),
  );

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.statCard, { backgroundColor: color + "20" }]}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardIcon}>{icon}</Text>
        <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statCardTitle}>{title}</Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ProgressBar = ({ label, value, color }) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarHeader}>
        <Text style={styles.progressBarLabel}>{label}</Text>
        <Text style={styles.progressBarValue}>{value}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${value}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );

  const ListChart = ({ data, labelKey, valueKey, colorKey }) => (
    <View style={styles.chartList}>
      {data.map((item, index) => (
        <View key={index} style={styles.chartItem}>
          <View
            style={[styles.chartDot, { backgroundColor: item[colorKey] }]}
          />
          <Text style={styles.chartLabel}>{item[labelKey]}</Text>
          <Text style={styles.chartValue}>{item[valueKey]}</Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Comprehensive insights and metrics
          </Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {["daily", "weekly", "monthly", "yearly"].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Projects"
            value={analytics.overview.totalProjects}
            subtitle={`${analytics.overview.activeProjects} active`}
            icon="📊"
            color="#4361ee"
          />
          <StatCard
            title="Users"
            value={analytics.overview.totalUsers}
            subtitle={`${analytics.overview.activeUsers} active`}
            icon="👥"
            color="#f72585"
          />
          <StatCard
            title="Tasks"
            value={analytics.overview.totalTasks}
            subtitle={`${analytics.overview.completedTasks} done`}
            icon="✓"
            color="#f8961e"
          />
          <StatCard
            title="Completion"
            value={`${analytics.overview.averageCompletion}%`}
            icon="📈"
            color="#43aa8b"
          />
        </View>
      </View>

      {/* Project Progress */}
      {analytics.projectStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Projects</Text>
          {analytics.projectStats.map((project, index) => (
            <View key={index} style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.name}</Text>
                <View style={styles.projectStats}>
                  <Text style={styles.projectStat}>
                    Tasks: {project.completed}/{project.tasks}
                  </Text>
                </View>
              </View>
              <ProgressBar
                label="Progress"
                value={project.progress}
                color="#4361ee"
              />
            </View>
          ))}
        </View>
      )}

      {/* User Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Distribution</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartColumn}>
            <Text style={styles.chartSubtitle}>By Role</Text>
            <ListChart
              data={analytics.userStats.byRole}
              labelKey="role"
              valueKey="count"
              colorKey="color"
            />
          </View>
          <View style={styles.chartDivider} />
          <View style={styles.chartColumn}>
            <Text style={styles.chartSubtitle}>By Status</Text>
            <ListChart
              data={analytics.userStats.byStatus}
              labelKey="status"
              valueKey="count"
              colorKey="color"
            />
          </View>
        </View>
      </View>

      {/* Task Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Analysis</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartColumn}>
            <Text style={styles.chartSubtitle}>By Priority</Text>
            <ListChart
              data={analytics.taskStats.byPriority}
              labelKey="priority"
              valueKey="count"
              colorKey="color"
            />
          </View>
          <View style={styles.chartDivider} />
          <View style={styles.chartColumn}>
            <Text style={styles.chartSubtitle}>By Status</Text>
            <ListChart
              data={analytics.taskStats.byStatus}
              labelKey="status"
              valueKey="count"
              colorKey="color"
            />
          </View>
        </View>
      </View>

      {/* Timeline Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#4cc9f0" }]}
              />
              <Text style={styles.legendText}>Created</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#43aa8b" }]}
              />
              <Text style={styles.legendText}>Completed</Text>
            </View>
          </View>

          <View style={styles.barChart}>
            {analytics.timelineData.labels.map((label, index) => {
              const maxValue = Math.max(
                ...analytics.timelineData.tasksCreated,
                ...analytics.timelineData.tasksCompleted,
                1,
              );
              const createdHeight =
                (analytics.timelineData.tasksCreated[index] / maxValue) * 80;
              const completedHeight =
                (analytics.timelineData.tasksCompleted[index] / maxValue) * 80;

              return (
                <View key={index} style={styles.barColumn}>
                  <Text style={styles.barLabel}>{label}</Text>
                  <View style={styles.barsContainer}>
                    {createdHeight > 0 && (
                      <View
                        style={[
                          styles.bar,
                          styles.createdBar,
                          { height: Math.max(4, createdHeight) },
                        ]}
                      />
                    )}
                    {completedHeight > 0 && (
                      <View
                        style={[
                          styles.bar,
                          styles.completedBar,
                          { height: Math.max(4, completedHeight) },
                        ]}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Export Button */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => Alert.alert("Export", "Export feature coming soon!")}
      >
        <View style={styles.exportGradient}>
          <Text style={styles.exportText}>📊 Export Report</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
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
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    fontSize: 16,
    color: "#6c757d",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4361ee",
    padding: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 15,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#4361ee",
  },
  periodButtonText: {
    color: "#6c757d",
    fontSize: 12,
    fontWeight: "600",
  },
  periodButtonTextActive: {
    color: "#fff",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: (width - 50) / 2,
    padding: 16,
    borderRadius: 16,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statCardIcon: {
    fontSize: 24,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  statCardTitle: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  statCardSubtitle: {
    fontSize: 11,
    color: "#6c757d",
    marginTop: 2,
  },
  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  projectStats: {
    flexDirection: "row",
  },
  projectStat: {
    fontSize: 12,
    color: "#6c757d",
    marginLeft: 8,
  },
  progressBarContainer: {
    marginBottom: 0,
  },
  progressBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressBarLabel: {
    fontSize: 12,
    color: "#6c757d",
  },
  progressBarValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  chartContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartColumn: {
    flex: 1,
  },
  chartDivider: {
    width: 1,
    backgroundColor: "#e9ecef",
    marginHorizontal: 16,
  },
  chartSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  chartList: {
    gap: 8,
  },
  chartItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  chartLabel: {
    flex: 1,
    fontSize: 13,
    color: "#495057",
  },
  chartValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  timelineContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#6c757d",
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barLabel: {
    fontSize: 10,
    color: "#6c757d",
    marginTop: 8,
  },
  barsContainer: {
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
    height: 100,
    width: "100%",
    gap: 2,
  },
  bar: {
    width: 12,
    borderRadius: 6,
  },
  createdBar: {
    backgroundColor: "#4cc9f0",
  },
  completedBar: {
    backgroundColor: "#43aa8b",
  },
  exportButton: {
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
  },
  exportGradient: {
    backgroundColor: "#4361ee",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#4361ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  exportText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
