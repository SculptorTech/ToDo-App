import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler (runs when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for notification!');
      return false;
    }
    
    // Configure Android channel (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('task-reminders', {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Schedule a notification for a task due date
export const scheduleTaskNotification = async (task) => {
  try {
    if (!task.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    
    // Only schedule if due date is in the future
    if (dueDate <= now) return null;
    
    // Calculate notification time (1 hour before due date, or at due date)
    const notificationTime = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before
    
    // If notification time is in the past, schedule at due date
    const triggerTime = notificationTime > now ? notificationTime : dueDate;
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Task Due Soon',
        body: `"${task.title}" is due at ${dueDate.toLocaleString()}`,
        data: { taskId: task.id, screen: 'EditTask' }, // Pass data for navigation
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
        channelId: 'task-reminders', // Android channel
      },
    });
    
    console.log(`Scheduled notification for task ${task.id}:`, notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Schedule multiple task notifications
export const scheduleAllTaskNotifications = async (tasks) => {
  try {
    // Cancel all existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule new ones for each task with future due dates
    const scheduledTasks = [];
    for (const task of tasks) {
      if (task.dueDate && !task.completed) {
        const notificationId = await scheduleTaskNotification(task);
        if (notificationId) {
          scheduledTasks.push({ taskId: task.id, notificationId });
        }
      }
    }
    
    return scheduledTasks;
  } catch (error) {
    console.error('Error scheduling all notifications:', error);
    return [];
  }
};

// Cancel a specific task notification
export const cancelTaskNotification = async (taskId, scheduledTasks) => {
  try {
    const taskNotification = scheduledTasks.find(t => t.taskId === taskId);
    if (taskNotification) {
      await Notifications.cancelScheduledNotificationAsync(taskNotification.notificationId);
      console.log(`Cancelled notification for task ${taskId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
};

// Cancel all notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
    return true;
  } catch (error) {
    console.error('Error cancelling notifications:', error);
    return false;
  }
};

// Handle notification responses (when user taps notification)
export const setupNotificationListeners = (navigation) => {
  // Listener for when notification is received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const { screen, taskId } = response.notification.request.content.data;
    
    if (screen && taskId && navigation) {
      // Navigate to the task edit screen
      navigation.navigate(screen, { taskId });
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};