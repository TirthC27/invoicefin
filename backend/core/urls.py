from django.urls import path
from . import views
from . import admin_views
from . import lawfirm_views
from . import notification_views

urlpatterns = [
    # Health
    path('health/', views.health_check, name='health_check'),

    # User
    path('user/me/', views.get_user_me, name='get_user_me'),

    # Pools
    path('pools/', views.list_pools, name='list_pools'),
    path('pools/create/', views.create_pool, name='create_pool'),
    path('pools/<int:pk>/', views.get_pool_detail, name='get_pool_detail'),

    # Investments
    path('investments/', views.list_investments, name='list_investments'),
    path('investments/initiate/', views.initiate_investment, name='initiate_investment'),
    path('investments/confirm/', views.confirm_investment, name='confirm_investment'),
    path('investments/verify/', views.verify_investment, name='verify_investment'),
    path('investments/fail/', views.fail_investment, name='fail_investment'),
    path('investment/calculate/', views.calculate_investment, name='calculate_investment'),

    # Portfolio
    path('portfolio/', views.get_portfolio, name='get_portfolio'),

    # Investor Recovery (read-only)
    path('investor/recovery-cases/', views.investor_recovery_cases, name='investor_recovery_cases'),

    # Transactions
    path('transactions/', views.list_transactions, name='list_transactions'),

    # ══════════════════════════════════════════════════════
    # ADMIN ROUTES
    # ══════════════════════════════════════════════════════
    path('admin/law-firms/', admin_views.list_law_firms, name='admin_list_law_firms'),
    path('admin/law-firms/create/', admin_views.create_law_firm, name='admin_create_law_firm'),
    path('admin/law-firms/<int:pk>/', admin_views.update_law_firm, name='admin_update_law_firm'),
    path('admin/recovery-cases/', admin_views.list_recovery_cases, name='admin_list_recovery_cases'),
    path('admin/recovery-cases/create/', admin_views.create_recovery_case, name='admin_create_recovery_case'),
    path('admin/recovery-cases/<int:pk>/assign/', admin_views.assign_law_firm_to_case, name='admin_assign_law_firm'),
    path('admin/users/', admin_views.list_users, name='admin_list_users'),

    # ══════════════════════════════════════════════════════
    # LAW FIRM ROUTES
    # ══════════════════════════════════════════════════════
    path('lawfirm/cases/', lawfirm_views.list_assigned_cases, name='lawfirm_list_cases'),
    path('lawfirm/cases/<int:pk>/', lawfirm_views.get_case_detail, name='lawfirm_case_detail'),
    path('lawfirm/cases/<int:pk>/events/', lawfirm_views.create_recovery_event, name='lawfirm_create_event'),
    path('lawfirm/cases/<int:pk>/documents/', lawfirm_views.upload_case_document, name='lawfirm_upload_document'),

    # ══════════════════════════════════════════════════════
    # NOTIFICATIONS (any role)
    # ══════════════════════════════════════════════════════
    path('notifications/', notification_views.list_notifications, name='list_notifications'),
    path('notifications/<int:pk>/read/', notification_views.mark_notification_read, name='mark_notification_read'),
    path('notifications/read-all/', notification_views.mark_all_notifications_read, name='mark_all_notifications_read'),
]
