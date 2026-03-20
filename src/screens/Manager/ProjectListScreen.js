// src/screens/manager/ProjectListScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getRequest } from "../../services/apiService";

export default function ProjectListScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // all, active, planning, completed, onhold
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load projects when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [user]),
  );

  const loadProjects = async () => {
    setLoading(true);
    try {
      console.log("📊 Loading projects for manager:", user?.UserID);

      const response = await getRequest("/project/get-projects");
      const allProjects = response.projects || response || [];

      // Filter projects assigned to this manager
      const assignedProjects = allProjects.filter((p) => {
        const assignedTo = p.AssignedTo || p.assignedTo;
        return assignedTo === user?.UserID;
      });

      console.log(`📋 Found ${assignedProjects.length} assigned projects`);

      setProjects(assignedProjects);
      applyFilters(assignedProjects, searchQuery, selectedFilter);
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      Alert.alert("Error", "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(projects, text, selectedFilter);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    applyFilters(projects, searchQuery, filter);
  };

  const applyFilters = (projectList, query, filter) => {
    let filtered = [...projectList];

    // Apply search filter
    if (query.trim() !== "") {
      filtered = filtered.filter((p) => {
        const name = (p.Name || p.name || "").toLowerCase();
        const client = (p.Client || p.client || "").toLowerCase();
        const description = (
          p.Description ||
          p.description ||
          ""
        ).toLowerCase();
        const searchLower = query.toLowerCase();

        return (
          name.includes(searchLower) ||
          client.includes(searchLower) ||
          description.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter((p) => {
        const status = (p.Status || p.status || "").toLowerCase();
        return status === filter.toLowerCase();
      });
    }

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "#4CAF50";
      case "planning":
        return "#FF9800";
      case "completed":
        return "#2196F3";
      case "onhold":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "#4CAF5020";
      case "planning":
        return "#FF980020";
      case "completed":
        return "#2196F320";
      case "onhold":
        return "#F4433620";
      default:
        return "#9E9E9E20";
    }
  };

  const getProgressColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "#4CAF50";
      case "planning":
        return "#FF9800";
      case "completed":
        return "#2196F3";
      case "onhold":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateProgress = (project) => {
    // You can implement actual progress calculation based on tasks
    // For now, return a random progress for demo
    return Math.floor(Math.random() * 100);
  };

  const getDaysRemaining = (endDateString) => {
    if (!endDateString) return null;

    const endDate = new Date(endDateString);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const renderProjectCard = ({ item }) => {
    const projectId = item.ProjectId || item.projectId || item.id;
    const projectName = item.Name || item.name || "Unnamed Project";
    const client = item.Client || item.client || "No Client";
    const description = item.Description || item.description || "";
    const status = item.Status || item.status || "planning";
    const startDate = item.StartDate || item.startDate;
    const endDate = item.EndDate || item.endDate;
    const budget = item.Budget || item.budget || 0;

    const progress = calculateProgress(item);
    const daysRemaining = getDaysRemaining(endDate);
    const isOverdue = daysRemaining < 0;

    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() =>
          navigation.navigate("ProjectDetails", {
            projectId: projectId,
            user: user,
          })
        }
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.projectName}>{projectName}</Text>
            <Text style={styles.projectId}>ID: {projectId}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBgColor(status) },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(status) }]}
            >
              {status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.clientContainer}>
          <Text style={styles.clientLabel}>Client</Text>
          <Text style={styles.clientName}>{client}</Text>
        </View>

        {/* Description */}
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                  backgroundColor: getProgressColor(status),
                },
              ]}
            />
          </View>
        </View>

        {/* Project Meta */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📅</Text>
            <View>
              <Text style={styles.metaLabel}>Start Date</Text>
              <Text style={styles.metaValue}>{formatDate(startDate)}</Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>🏁</Text>
            <View>
              <Text style={styles.metaLabel}>End Date</Text>
              <Text style={[styles.metaValue, isOverdue && styles.overdueText]}>
                {formatDate(endDate)}
                {daysRemaining !== null && !isOverdue && daysRemaining <= 7 && (
                  <Text style={styles.urgentText}>
                    {" "}
                    • {daysRemaining} days left
                  </Text>
                )}
                {isOverdue && (
                  <Text style={styles.overdueText}> • Overdue</Text>
                )}
              </Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>💰</Text>
            <View>
              <Text style={styles.metaLabel}>Budget</Text>
              <Text style={styles.metaValue}>${budget.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filters = [
    { id: "all", label: "All", color: "#9E9E9E" },
    { id: "planning", label: "Planning", color: "#FF9800" },
    { id: "active", label: "Active", color: "#4CAF50" },
    { id: "onhold", label: "On Hold", color: "#369bf4" },
    { id: "completed", label: "Completed", color: "#2196F3" },
  ];

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
        <View>
          <Text style={styles.headerTitle}>My Projects</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProjects.length} project
            {filteredProjects.length !== 1 ? "s" : ""} assigned
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects by name, client..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.id && styles.filterChipActive,
                selectedFilter === item.id && { borderColor: item.color },
              ]}
              onPress={() => handleFilterChange(item.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === item.id && { color: item.color },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Project List */}
      <FlatList
        data={filteredProjects}
        renderItem={renderProjectCard}
        keyExtractor={(item) => {
          const id = item.ProjectId || item.projectId || item.id;
          return id?.toString() || Math.random().toString();
        }}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#f72585"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {loading ? "Loading projects..." : "No Projects Found"}
            </Text>
            {!loading && (
              <>
                <Text style={styles.emptyText}>
                  {searchQuery || selectedFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "You don't have any projects assigned yet"}
                </Text>
                {(searchQuery || selectedFilter !== "all") && (
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setSearchQuery("");
                      setSelectedFilter("all");
                      setFilteredProjects(projects);
                    }}
                  >
                    <Text style={styles.clearFiltersText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
        ListFooterComponent={<View style={styles.footer} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25a3f7",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: "#9E9E9E",
    padding: 4,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: "#fff",
    borderWidth: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  projectId: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  clientContainer: {
    marginBottom: 12,
  },
  clientLabel: {
    fontSize: 12,
    color: "#9E9E9E",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f72585",
  },
  description: {
    fontSize: 14,
    color: "#6c757d",
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#f1f3f5",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    fontSize: 16,
  },
  metaLabel: {
    fontSize: 10,
    color: "#9E9E9E",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  urgentText: {
    fontSize: 11,
    color: "#FF9800",
    fontWeight: "600",
  },
  overdueText: {
    fontSize: 11,
    color: "#F44336",
    fontWeight: "600",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
    paddingTop: 12,
    alignItems: "flex-end",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#f72585",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#9E9E9E",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  clearFiltersButton: {
    backgroundColor: "#f72585",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#f72585",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  clearFiltersText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    height: 20,
  },
});
