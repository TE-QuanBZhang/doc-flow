import type { ThemeConfig } from 'antd'

export const docFlowTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontFamily: '"Inter", "PingFang SC", "Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    fontSize: 14,
    controlHeight: 40,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Button: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      borderRadius: 8,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
    },
    Input: {
      controlHeight: 40,
      borderRadius: 8,
    },
    Select: {
      controlHeight: 40,
      borderRadius: 8,
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemPaddingInline: 16,
      iconSize: 18,
    },
    Layout: {
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      bodyBg: '#f8fafc',
    },
    Steps: {
      borderRadius: 8,
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
}
