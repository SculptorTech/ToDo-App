// src/screens/manager/TeamsManagementScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    deleteRequest,
    getRequest,
    postRequest,
    putRequest,
} from "../../services/apiService";

export default function TeamsManagementScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembersModal, setTeamMembersModal] = useState(false);
  const [teamProjectsModal, setTeamProjectsModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Dropdown states
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Form states
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
    leadId: null,
    members: [],
    projectIds: [],
  });

  const [editingTeam, setEditingTeam] = useState(null);

  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTeams(), loadUsers(), loadProjects()]);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await getRequest("/team/get-teams");
      const teamsData = response.teams || response || [];
      setTeams(teamsData);
      console.log("✅ Teams loaded:", teamsData.length);
    } catch (error) {
      console.error("Error loading teams:", error);
      throw error;
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getRequest("/user/getusers");
      const usersData = response.users || response || [];
      setUsers(usersData);
      console.log("✅ Users loaded:", usersData.length);
    } catch (error) {
      console.error("Error loading users:", error);
      throw error;
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getRequest("/project/get-projects");
      const projectsData = response.projects || response || [];
      setProjects(projectsData);
      console.log("✅ Projects loaded:", projectsData.length);
    } catch (error) {
      console.error("Error loading projects:", error);
      throw error;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Create new team
  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      Alert.alert("Error", "Team name is required");
      return;
    }
    if (!newTeam.leadId) {
      Alert.alert("Error", "Team lead is required");
      return;
    }
    if (newTeam.members.length === 0) {
      Alert.alert("Error", "At least one team member is required");
      return;
    }

    setCreateLoading(true);
    try {
      const teamData = {
        name: newTeam.name.trim(),
        description: newTeam.description.trim(),
        leadId: newTeam.leadId,
        memberIds: newTeam.members,
        projectIds: newTeam.projectIds,
      };

      console.log("📤 Creating team:", teamData);
      const response = await postRequest("/team/create-team", teamData);
      console.log("✅ Team created:", response);

      // Immediately reload teams to show the new team
      await loadTeams();

      // Close modal and reset form
      setCreateModal(false);
      resetNewTeamForm();

      Alert.alert("Success", "Team created successfully");
    } catch (error) {
      console.error("Error creating team:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create team",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // Update team
  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    if (!editingTeam.name.trim()) {
      Alert.alert("Error", "Team name is required");
      return;
    }

    try {
      const teamData = {
        name: editingTeam.name.trim(),
        description: editingTeam.description,
        leadId: editingTeam.leadId,
      };

      await putRequest(`/team/update-team/${editingTeam.id}`, teamData);
      await loadTeams();
      setEditModal(false);
      setEditingTeam(null);
      Alert.alert("Success", "Team updated successfully");
    } catch (error) {
      console.error("Error updating team:", error);
      Alert.alert("Error", "Failed to update team");
    }
  };

  // Delete team
  const handleDeleteTeam = (teamId) => {
    Alert.alert(
      "Delete Team",
      "Are you sure you want to delete this team? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRequest(`/team/delete-team/${teamId}`);
              await loadTeams();
              setViewModal(false);
              setSelectedTeam(null);
              Alert.alert("Success", "Team deleted successfully");
            } catch (error) {
              console.error("Error deleting team:", error);
              Alert.alert("Error", "Failed to delete team");
            }
          },
        },
      ],
    );
  };

  // Add member to team
  const handleAddMember = async (teamId, userId) => {
    try {
      await postRequest(`/team/add-member/${teamId}`, { userId });
      await loadTeams();
      Alert.alert("Success", "Member added successfully");
    } catch (error) {
      console.error("Error adding member:", error);
      Alert.alert("Error", "Failed to add member");
    }
  };

  // Remove member from team
  const handleRemoveMember = async (teamId, userId) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member from the team?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRequest(`/team/remove-member/${teamId}/${userId}`);
              await loadTeams();
              Alert.alert("Success", "Member removed successfully");
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ],
    );
  };

  // Add project to team
  const handleAddProject = async (teamId, projectId) => {
    try {
      await postRequest(`/team/assign-project/${teamId}`, { projectId });
      await loadTeams();
      Alert.alert("Success", "Project assigned successfully");
    } catch (error) {
      console.error("Error adding project:", error);
      Alert.alert("Error", "Failed to assign project");
    }
  };

  // Remove project from team
  const handleRemoveProject = async (teamId, projectId) => {
    Alert.alert(
      "Remove Project",
      "Are you sure you want to remove this project from the team?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRequest(
                `/team/remove-project/${teamId}/${projectId}`,
              );
              await loadTeams();
              Alert.alert("Success", "Project removed successfully");
            } catch (error) {
              console.error("Error removing project:", error);
              Alert.alert("Error", "Failed to remove project");
            }
          },
        },
      ],
    );
  };

  const resetNewTeamForm = () => {
    setNewTeam({
      name: "",
      description: "",
      leadId: null,
      members: [],
      projectIds: [],
    });
  };

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [teams, searchQuery]);

  // Get user display name
  const getUserName = (user) => {
    return user?.FullName || user?.name || user?.Name || "Unknown";
  };

  // Get user email
  const getUserEmail = (user) => {
    return user?.Email || user?.email || user?.EmailID || "";
  };

  // Get user role
  const getUserRole = (user) => {
    return user?.Role || user?.role || user?.RoleName || "Employee";
  };

  // Get available leads (users who are not already leading a team)
  const availableLeads = useMemo(() => {
    const currentLeads = teams.map((t) => t.leadId);
    return users.filter(
      (user) =>
        (user.Role === "Manager" || user.role === "Manager") &&
        !currentLeads.includes(user.id || user.UserID),
    );
  }, [users, teams]);

  // Get available members (developers not in any team)
  const availableMembers = useMemo(() => {
    const allTeamMemberIds = teams.flatMap((t) => t.members || []);
    return users.filter(
      (user) =>
        (user.Role === "Developer" || user.role === "Developer") &&
        !allTeamMemberIds.includes(user.id || user.UserID),
    );
  }, [users, teams]);

  // Custom Dropdown Component for single select
  const SingleSelectDropdown = ({
    visible,
    onClose,
    items,
    onSelect,
    selectedId,
    title,
  }) => {
    if (!visible) return null;

    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.dropdownClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id || item.UserID || item._id}
                  style={[
                    styles.dropdownItem,
                    (selectedId === item.id || selectedId === item.UserID) &&
                      styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onSelect(item.id || item.UserID);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      (selectedId === item.id || selectedId === item.UserID) &&
                        styles.dropdownItemTextActive,
                    ]}
                  >
                    {getUserName(item)}
                  </Text>
                  {getUserRole(item) && (
                    <Text style={styles.dropdownItemSubtext}>
                      {getUserRole(item)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Multi-Select Dropdown Component for members
  const MemberMultiSelectDropdown = ({
    visible,
    onClose,
    items,
    selectedIds,
    onSelect,
    onRemove,
    title,
  }) => {
    if (!visible) return null;

    const handleToggle = (itemId) => {
      if (selectedIds.includes(itemId)) {
        onRemove(itemId);
      } else {
        onSelect(itemId);
      }
    };

    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.dropdownClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {items.map((item) => {
                const itemId = item.id || item.UserID;
                const isSelected = selectedIds.includes(itemId);
                return (
                  <TouchableOpacity
                    key={itemId}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemActive,
                    ]}
                    onPress={() => handleToggle(itemId)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextActive,
                      ]}
                    >
                      {getUserName(item)}
                    </Text>
                    {getUserRole(item) && (
                      <Text style={styles.dropdownItemSubtext}>
                        {getUserRole(item)}
                      </Text>
                    )}
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.dropdownDoneButton}
              onPress={onClose}
            >
              <Text style={styles.dropdownDoneButtonText}>
                Done ({selectedIds.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Team Card Component
  const TeamCard = ({ team, onPress }) => {
    const teamLead = users.find((u) => (u.id || u.UserID) === team.leadId);
    const memberCount = team.members?.length || 0;
    const projectCount = team.projects?.length || 0;

    return (
      <TouchableOpacity style={styles.teamCard} onPress={() => onPress(team)}>
        <View style={styles.teamHeader}>
          <View style={styles.teamIcon}>
            <Text style={styles.teamIconText}>👥</Text>
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{team.name}</Text>
            {teamLead && (
              <Text style={styles.teamLead}>Lead: {getUserName(teamLead)}</Text>
            )}
          </View>
        </View>

        {team.description && (
          <Text style={styles.teamDescription} numberOfLines={2}>
            {team.description}
          </Text>
        )}

        <View style={styles.teamStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statText}>{memberCount} Members</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={styles.statText}>{projectCount} Projects</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && teams.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Loading teams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Team Management</Text>
          <Text style={styles.headerSubtitle}>
            Create and manage teams with members and projects
          </Text>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{teams.length}</Text>
          <Text style={styles.statLabel}>Total Teams</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Available Members</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{projects.length}</Text>
          <Text style={styles.statLabel}>Available Projects</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search teams by name or description..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Teams List */}
      <FlatList
        data={filteredTeams}
        keyExtractor={(item) =>
          item.id?.toString() ||
          item._id?.toString() ||
          Math.random().toString()
        }
        renderItem={({ item }) => (
          <TeamCard
            team={item}
            onPress={(team) => {
              setSelectedTeam(team);
              setViewModal(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {loading ? "Loading..." : "No Teams Found"}
            </Text>
            <Text style={styles.emptyText}>
              Tap + to create your first team
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateModal(true)}>
        <View style={styles.fabGradient}>
          <Text style={styles.fabIcon}>+</Text>
        </View>
      </TouchableOpacity>

      {/* Create Team Modal */}
      <Modal visible={createModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Team</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Team Name *</Text>
              <TextInput
                style={styles.input}
                value={newTeam.name}
                onChangeText={(text) => setNewTeam({ ...newTeam, name: text })}
                placeholder="Enter team name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newTeam.description}
                onChangeText={(text) =>
                  setNewTeam({ ...newTeam, description: text })
                }
                placeholder="Enter team description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Team Lead Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Team Lead *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowLeadDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {newTeam.leadId
                    ? getUserName(
                        users.find(
                          (u) => (u.id || u.UserID) === newTeam.leadId,
                        ),
                      )
                    : "Select Team Lead"}
                </Text>
                <Text style={styles.dropdownButtonIcon}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Team Members Selection - Multi-select for developers */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Team Members * (Select multiple)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowMemberDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {newTeam.members.length > 0
                    ? `${newTeam.members.length} developer(s) selected`
                    : "Select Team Members"}
                </Text>
                <Text style={styles.dropdownButtonIcon}>▼</Text>
              </TouchableOpacity>
              {newTeam.members.length > 0 && (
                <View style={styles.selectedItems}>
                  {newTeam.members.map((memberId) => {
                    const member = users.find(
                      (u) => (u.id || u.UserID) === memberId,
                    );
                    return (
                      <View key={memberId} style={styles.selectedItem}>
                        <Text style={styles.selectedItemText}>
                          {getUserName(member)}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setNewTeam({
                              ...newTeam,
                              members: newTeam.members.filter(
                                (id) => id !== memberId,
                              ),
                            })
                          }
                        >
                          <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Project Assignment */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign Projects (Optional)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowProjectDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {newTeam.projectIds.length > 0
                    ? `${newTeam.projectIds.length} project(s) selected`
                    : "Select Projects"}
                </Text>
                <Text style={styles.dropdownButtonIcon}>▼</Text>
              </TouchableOpacity>
              {newTeam.projectIds.length > 0 && (
                <View style={styles.selectedItems}>
                  {newTeam.projectIds.map((projectId) => {
                    const project = projects.find(
                      (p) => (p.id || p._id) === projectId,
                    );
                    return (
                      <View key={projectId} style={styles.selectedItem}>
                        <Text style={styles.selectedItemText}>
                          {project?.name || project?.Name}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setNewTeam({
                              ...newTeam,
                              projectIds: newTeam.projectIds.filter(
                                (id) => id !== projectId,
                              ),
                            })
                          }
                        >
                          <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCreateModal(false);
                  resetNewTeamForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  createLoading && styles.disabledButton,
                ]}
                onPress={handleCreateTeam}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create Team</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Single Select Dropdown for Team Lead */}
      <SingleSelectDropdown
        visible={showLeadDropdown}
        onClose={() => setShowLeadDropdown(false)}
        items={availableLeads}
        selectedId={newTeam.leadId}
        onSelect={(id) => setNewTeam({ ...newTeam, leadId: id })}
        title="Select Team Lead"
      />

      {/* Multi-Select Dropdown for Members */}
      <MemberMultiSelectDropdown
        visible={showMemberDropdown}
        onClose={() => setShowMemberDropdown(false)}
        items={availableMembers}
        selectedIds={newTeam.members}
        onSelect={(id) =>
          setNewTeam({ ...newTeam, members: [...newTeam.members, id] })
        }
        onRemove={(id) =>
          setNewTeam({
            ...newTeam,
            members: newTeam.members.filter((m) => m !== id),
          })
        }
        title="Select Team Members"
      />

      {/* Multi-Select Dropdown for Projects */}
      <MemberMultiSelectDropdown
        visible={showProjectDropdown}
        onClose={() => setShowProjectDropdown(false)}
        items={projects.map((p) => ({
          ...p,
          name: p.name || p.Name,
          id: p.id || p._id,
        }))}
        selectedIds={newTeam.projectIds}
        onSelect={(id) =>
          setNewTeam({ ...newTeam, projectIds: [...newTeam.projectIds, id] })
        }
        onRemove={(id) =>
          setNewTeam({
            ...newTeam,
            projectIds: newTeam.projectIds.filter((p) => p !== id),
          })
        }
        title="Select Projects"
      />

      {/* Team View Modal */}
      <Modal visible={viewModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            {selectedTeam && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTeamIcon}>
                    <Text style={styles.modalTeamIconText}>👥</Text>
                  </View>
                  <TouchableOpacity onPress={() => setViewModal(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTeamName}>{selectedTeam.name}</Text>
                {selectedTeam.description && (
                  <Text style={styles.modalTeamDescription}>
                    {selectedTeam.description}
                  </Text>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setEditingTeam(selectedTeam);
                      setEditModal(true);
                      setViewModal(false);
                    }}
                  >
                    <Text style={styles.actionButtonIcon}>✏️</Text>
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setTeamMembersModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonIcon}>👥</Text>
                    <Text style={styles.actionButtonText}>Members</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setTeamProjectsModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonIcon}>📊</Text>
                    <Text style={styles.actionButtonText}>Projects</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() =>
                      handleDeleteTeam(selectedTeam.id || selectedTeam._id)
                    }
                  >
                    <Text style={styles.actionButtonIcon}>🗑️</Text>
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Team Lead */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Team Lead</Text>
                  {(() => {
                    const lead = users.find(
                      (u) => (u.id || u.UserID) === selectedTeam.leadId,
                    );
                    return lead ? (
                      <View style={styles.leadCard}>
                        <View style={styles.leadAvatar}>
                          <Text style={styles.leadAvatarText}>
                            {getUserName(lead).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.leadInfo}>
                          <Text style={styles.leadName}>
                            {getUserName(lead)}
                          </Text>
                          <Text style={styles.leadEmail}>
                            {getUserEmail(lead)}
                          </Text>
                          <Text style={styles.leadRole}>
                            {getUserRole(lead)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>
                        No team lead assigned
                      </Text>
                    );
                  })()}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Team Members Management Modal */}
      <Modal
        visible={teamMembersModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.largeModal]}>
            <Text style={styles.modalTitle}>Manage Team Members</Text>
            <Text style={styles.modalSubtitle}>{selectedTeam?.name}</Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Current Members ({selectedTeam?.members?.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setTeamMembersModal(false);
                  setShowMemberDropdown(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.memberList}>
              {(selectedTeam?.members || []).map((memberId) => {
                const member = users.find(
                  (u) => (u.id || u.UserID) === memberId,
                );
                return member ? (
                  <View key={memberId} style={styles.memberItem}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {getUserName(member).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {getUserName(member)}
                      </Text>
                      <Text style={styles.memberEmail}>
                        {getUserEmail(member)}
                      </Text>
                      <Text style={styles.memberRole}>
                        {getUserRole(member)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() =>
                        handleRemoveMember(
                          selectedTeam.id || selectedTeam._id,
                          memberId,
                        )
                      }
                    >
                      <Text style={styles.removeMemberButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : null;
              })}
              {(!selectedTeam?.members ||
                selectedTeam.members.length === 0) && (
                <Text style={styles.emptyText}>No members in this team</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setTeamMembersModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Team Projects Management Modal */}
      <Modal
        visible={teamProjectsModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.largeModal]}>
            <Text style={styles.modalTitle}>Manage Team Projects</Text>
            <Text style={styles.modalSubtitle}>{selectedTeam?.name}</Text>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Assigned Projects ({selectedTeam?.projects?.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setTeamProjectsModal(false);
                  setShowProjectDropdown(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Assign</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.projectList}>
              {(selectedTeam?.projects || []).map((projectId) => {
                const project = projects.find(
                  (p) => (p.id || p._id) === projectId,
                );
                return project ? (
                  <View key={projectId} style={styles.projectItem}>
                    <View style={styles.projectIcon}>
                      <Text style={styles.projectIconText}>📁</Text>
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>
                        {project.name || project.Name}
                      </Text>
                      <Text style={styles.projectDescription}>
                        {project.description || "No description"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() =>
                        handleRemoveProject(
                          selectedTeam.id || selectedTeam._id,
                          projectId,
                        )
                      }
                    >
                      <Text style={styles.removeMemberButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : null;
              })}
              {(!selectedTeam?.projects ||
                selectedTeam.projects.length === 0) && (
                <Text style={styles.emptyText}>No projects assigned</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setTeamProjectsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Team Modal */}
      <Modal visible={editModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Team</Text>

            {editingTeam && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Team Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={editingTeam.name}
                    onChangeText={(text) =>
                      setEditingTeam({ ...editingTeam, name: text })
                    }
                    placeholder="Enter team name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingTeam.description}
                    onChangeText={(text) =>
                      setEditingTeam({ ...editingTeam, description: text })
                    }
                    placeholder="Enter team description"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Team Lead</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowLeadDropdown(true);
                      setEditModal(false);
                    }}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {editingTeam.leadId
                        ? getUserName(
                            users.find(
                              (u) => (u.id || u.UserID) === editingTeam.leadId,
                            ),
                          )
                        : "Select Team Lead"}
                    </Text>
                    <Text style={styles.dropdownButtonIcon}>▼</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleUpdateTeam}
                  >
                    <Text style={styles.createButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
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
    backgroundColor: "#4361ee",
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerContent: {
    flex: 1,
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
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 11,
    color: "#6c757d",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#e9ecef",
  },
  searchContainer: {
    padding: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchIcon: {
    fontSize: 16,
    color: "#6c757d",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  clearIcon: {
    fontSize: 16,
    color: "#6c757d",
    padding: 5,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  teamCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4361ee20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  teamIconText: {
    fontSize: 24,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  teamLead: {
    fontSize: 12,
    color: "#6c757d",
  },
  teamDescription: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 12,
    lineHeight: 20,
  },
  teamStats: {
    flexDirection: "row",
    marginTop: 8,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 10,
  },
  statEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: "#495057",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4361ee",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  largeModal: {
    width: "95%",
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTeamIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4361ee20",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTeamIconText: {
    fontSize: 40,
  },
  modalClose: {
    fontSize: 20,
    color: "#6c757d",
    padding: 5,
  },
  modalTeamName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  modalTeamDescription: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 20,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    minWidth: "23%",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#495057",
  },
  deleteButton: {
    backgroundColor: "#f7258520",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 12,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  dropdownButtonIcon: {
    fontSize: 12,
    color: "#6c757d",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  dropdownClose: {
    fontSize: 18,
    color: "#6c757d",
    padding: 5,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemActive: {
    backgroundColor: "#4361ee10",
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
  },
  dropdownItemTextActive: {
    color: "#4361ee",
    fontWeight: "600",
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: "#6c757d",
    marginLeft: 8,
  },
  checkmark: {
    fontSize: 16,
    color: "#4361ee",
    fontWeight: "bold",
    marginLeft: 8,
  },
  dropdownDoneButton: {
    backgroundColor: "#4361ee",
    padding: 14,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  dropdownDoneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedItems: {
    marginTop: 8,
  },
  selectedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  selectedItemText: {
    fontSize: 13,
    color: "#1a1a1a",
  },
  removeText: {
    fontSize: 14,
    color: "#dc3545",
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cancelButtonText: {
    color: "#6c757d",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#4361ee",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  closeButton: {
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: "#6c757d",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  addButton: {
    backgroundColor: "#4361ee20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#4361ee",
    fontSize: 12,
    fontWeight: "600",
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  leadCard: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
  },
  leadAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4361ee20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  leadAvatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4361ee",
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  leadEmail: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  leadRole: {
    fontSize: 11,
    color: "#4361ee",
  },
  memberList: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4361ee20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4361ee",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 11,
    color: "#4361ee",
  },
  removeMemberButton: {
    backgroundColor: "#dc354520",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeMemberButtonText: {
    color: "#dc3545",
    fontSize: 12,
    fontWeight: "600",
  },
  projectList: {
    maxHeight: 400,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  projectIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#4cc9f020",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  projectIconText: {
    fontSize: 24,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  projectDescription: {
    fontSize: 12,
    color: "#6c757d",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
});
