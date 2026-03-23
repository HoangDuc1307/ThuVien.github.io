"""
Custom JWT Authentication for Book Service.
Since Book Service and User Service use separate databases,
we don't need to fetch the user from the database.
We only need to extract user_id from the JWT token.
"""

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
import jwt


class TokenUser:
    """
    A simple user-like object that doesn't require database lookup.
    This is used for microservices architecture where user data
    is stored in a separate service (User Service).
    """
    def __init__(self, user_id, token_payload):
        self.id = user_id
        self.pk = user_id
        self.username = token_payload.get('username', '')
        self.is_staff = token_payload.get('is_staff', False)
        self.is_authenticated = True
        self.is_active = True
        
    def __str__(self):
        return f"User {self.id}"
    
    def has_perm(self, perm, obj=None):
        return False
    
    def has_perms(self, perm_list, obj=None):
        return False
    
    def has_module_perms(self, app_label):
        return False


class CustomJWTAuthentication(BaseAuthentication):
    """
    Custom JWT Authentication that doesn't require the user to exist
    in the Book Service database. It only extracts user information
    from the JWT token payload.
    
    This is necessary because Book Service and User Service have
    separate databases, so we can't query for users in Book Service.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        
        return (user, validated_token)
    
    def get_header(self, request):
        """
        Extracts the header containing the JSON web token from the given
        request.
        """
        header = request.META.get('HTTP_AUTHORIZATION')

        if isinstance(header, str):
            # Work around django test client oddness
            header = header.encode('utf-8')

        return header
    
    def get_raw_token(self, header):
        """
        Extracts an unvalidated JSON web token from the given "Authorization"
        header value.
        """
        parts = header.split()

        if len(parts) == 0:
            # Empty AUTHORIZATION header sent
            return None

        if parts[0].decode('utf-8') != 'Bearer':
            # Assume the header does not contain a JSON web token
            return None

        if len(parts) != 2:
            raise AuthenticationFailed(
                'Authorization header must contain two space-delimited values',
                code='bad_authorization_header',
            )

        return parts[1]
    
    def get_validated_token(self, raw_token):
        """
        Validates an encoded JSON web token and returns the decoded payload as dict.
        """
        try:
            # Decode token using the same signing key as User Service
            signing_key = settings.SIMPLE_JWT.get('SIGNING_KEY', settings.SECRET_KEY)
            algorithm = settings.SIMPLE_JWT.get('ALGORITHM', 'HS256')
            
            # Handle both bytes and string
            if isinstance(raw_token, bytes):
                token_str = raw_token.decode('utf-8')
            else:
                token_str = raw_token
            
            decoded_token = jwt.decode(
                token_str,
                signing_key,
                algorithms=[algorithm]
            )
            
            return decoded_token
        except jwt.ExpiredSignatureError:
            raise InvalidToken('Token has expired')
        except jwt.DecodeError:
            raise InvalidToken('Token is invalid')
        except Exception as e:
            raise InvalidToken(f'Token validation failed: {str(e)}')
    
    def get_user(self, validated_token):
        """
        Returns a user object from the validated token payload.
        This method doesn't query the database.
        """
        # Get user_id from token payload (dict)
        # SimpleJWT stores user_id in the token payload
        user_id = validated_token.get('user_id')
        
        if user_id is None:
            raise InvalidToken('Token contained no recognizable user identification')

        # Create a TokenUser object with the user_id from token
        # We don't need to fetch from database since Book Service
        # only uses user_id (stored as IntegerField in BorrowRecord)
        user = TokenUser(user_id, validated_token)
        return user

