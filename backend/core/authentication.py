import os
import jwt
from rest_framework import authentication
from rest_framework import exceptions

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        # Supabase uses HS256 to sign JWTs unless changed. The secret is needed.
        jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
        if not jwt_secret:
            raise exceptions.AuthenticationFailed('SUPABASE_JWT_SECRET not configured on backend.')
            
        try:
            # The token is verified against the project JWT secret
            # Provide algorithms and audience if needed. By default, supabase sets aud='authenticated'
            decoded = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
            
            # The user identity is the sub claim which is the auth.users.id UUID
            user_id = decoded.get('sub')
            
            # Create a simple mock user object to attach to request.user
            # In a real app we might fetch the user from a local mirrored table
            class SimpleUser:
                def __init__(self, uid, email, role):
                    self.id = uid
                    self.email = email
                    self.role = role
                    self.is_authenticated = True
            
            user = SimpleUser(user_id, decoded.get('email'), decoded.get('role', 'investor'))
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.DecodeError:
            raise exceptions.AuthenticationFailed('Invalid token.')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')
