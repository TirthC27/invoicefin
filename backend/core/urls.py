from django.urls import path
from . import views

urlpatterns = [
    # Health
    path('health/', views.health_check, name='health_check'),

    # User
    path('user/me/', views.get_user_me, name='get_user_me'),

    # Pools
    path('pools/', views.list_pools, name='list_pools'),
    path('pools/create/', views.create_pool, name='create_pool'),

    # Investments
    path('investments/', views.list_investments, name='list_investments'),
    path('investments/initiate/', views.initiate_investment, name='initiate_investment'),
    path('investments/confirm/', views.confirm_investment, name='confirm_investment'),
    path('investments/verify/', views.verify_investment, name='verify_investment'),
    path('investments/fail/', views.fail_investment, name='fail_investment'),

    # Portfolio
    path('portfolio/', views.get_portfolio, name='get_portfolio'),

    # Transactions
    path('transactions/', views.list_transactions, name='list_transactions'),
]
