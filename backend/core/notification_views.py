from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .authentication import SupabaseJWTAuthentication
from .models import AppUser, Notification
from .role_serializers import NotificationSerializer


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    GET /api/notifications
    Returns notifications for the current user (any role).
    """
    try:
        app_user = AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return Response([])

    notifications = Notification.objects.filter(user=app_user)[:50]
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    """
    PATCH /api/notifications/:id/read
    Mark a single notification as read.
    """
    try:
        app_user = AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)

    try:
        notification = Notification.objects.get(pk=pk, user=app_user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found.'}, status=404)

    notification.read = True
    notification.save()
    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """
    POST /api/notifications/read-all
    Mark all notifications as read for the current user.
    """
    try:
        app_user = AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)

    updated = Notification.objects.filter(user=app_user, read=False).update(read=True)
    return Response({'marked_read': updated})
