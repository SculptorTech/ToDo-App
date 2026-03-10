// src/utils/permissions.js
import { ROLES, ROLE_HIERARCHY } from './roles';

export const can = (userRole, action, resource = null) => {
  const roleLevel = ROLE_HIERARCHY[userRole] || 0;

  // Admin can do everything
  if (userRole === ROLES.ADMIN) return true;

  const permissions = {
    // Project permissionss
    create_project: [ROLES.ADMIN, ROLES.MANAGER],
    delete_project: [ROLES.ADMIN],
    edit_project: [ROLES.ADMIN, ROLES.MANAGER],
    view_project: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.DEVELOPER, ROLES.VIEWER],

    // User permissions..
    create_user: [ROLES.ADMIN],
    delete_user: [ROLES.ADMIN],
    edit_user: [ROLES.ADMIN, ROLES.MANAGER],
    view_users: [ROLES.ADMIN, ROLES.MANAGER],

    // Task permissions..
    create_task: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.DEVELOPER],
    delete_task: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
    edit_task: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.DEVELOPER],
    view_tasks: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD, ROLES.DEVELOPER, ROLES.VIEWER],

    // Team permissions..
    create_team: [ROLES.ADMIN],
    delete_team: [ROLES.ADMIN],
    edit_team: [ROLES.ADMIN, ROLES.MANAGER],
    view_teams: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],

    // Role permissions
    assign_roles: [ROLES.ADMIN],
    view_roles: [ROLES.ADMIN, ROLES.MANAGER],

    // Analytics
    view_analytics: [ROLES.ADMIN, ROLES.MANAGER],

    // Sprint permissions
    create_sprint: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
    edit_sprint: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],

    // Review permissions
    review_task: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
  };

  return permissions[action]?.includes(userRole) || false;
};

export const canEditTask = (userRole, userId, task) => {
  if (userRole === ROLES.ADMIN) return true;
  if (userRole === ROLES.MANAGER) return true;
  if (userRole === ROLES.TEAM_LEAD) return true;
  if (userRole === ROLES.DEVELOPER && task.assignedTo === userId) return true;
  return false;
};

export const canDeleteTask = (userRole, userId, task) => {
  if (userRole === ROLES.ADMIN) return true;
  if (userRole === ROLES.MANAGER) return true;
  if (userRole === ROLES.TEAM_LEAD) return true;
  return false;
};