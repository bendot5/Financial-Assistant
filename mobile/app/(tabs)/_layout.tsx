import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName, focusedName: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? focusedName : name} size={24} color={color} />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.tabBorder },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'מסך הבית', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'הוסף', tabBarIcon: tabIcon('chatbubble-outline', 'chatbubble') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'היסטוריה', tabBarIcon: tabIcon('list-outline', 'list') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'הגדרות', tabBarIcon: tabIcon('settings-outline', 'settings') }}
      />
    </Tabs>
  );
}
