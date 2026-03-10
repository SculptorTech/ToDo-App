import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function AdminHome({ route }) {
  const [users, setUsers] = useState([]);
  const { user } = route.params;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/all-users`);
      setUsers(response.data.users);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch users');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`${API_URL}/user/update-role/${userId}`, { role: newRole });
      Alert.alert('Success', 'Role updated successfully');
      fetchUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => showRoleOptions(item)}
      >
        <Text style={styles.editButtonText}>Change Role</Text>
      </TouchableOpacity>
    </View>
  );

  const showRoleOptions = (user) => {
    Alert.alert(
      'Change Role',
      `Select new role for ${user.name}`,
      [
        { text: 'Admin', onPress: () => updateUserRole(user.id, 'admin') },
        { text: 'Manager', onPress: () => updateUserRole(user.id, 'manager') },
        { text: 'Team Lead', onPress: () => updateUserRole(user.id, 'team_lead') },
        { text: 'Developer', onPress: () => updateUserRole(user.id, 'developer') },
        { text: 'Viewer', onPress: () => updateUserRole(user.id, 'viewer') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: '#dc3545',
      manager: '#fd7e14',
      team_lead: '#ffc107',
      developer: '#28a745',
      viewer: '#6c757d'
    };
    return colors[role] || '#6c757d';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, {user.name}</Text>
      
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});