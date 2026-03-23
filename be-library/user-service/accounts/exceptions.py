from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # Lấy response mặc định từ DRF
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'success': False,
            'message': 'Thất bại',
            'errors': response.data
        }

        # Tùy chỉnh message cho một số lỗi phổ biến
        if response.status_code == 401:
            custom_data['message'] = 'Tên đăng nhập hoặc mật khẩu không chính xác.'
        elif response.status_code == 400:
            custom_data['message'] = 'Dữ liệu không hợp lệ.'
        
        # Một số trường hợp response.data là string hoặc dict, ta chuẩn hóa
        if isinstance(response.data, dict) and 'detail' in response.data:
            custom_data['message'] = response.data['detail']
            # Nếu message mặc định là tiếng Anh của DRF, ta dịch sang tiếng Việt
            if custom_data['message'] == 'No active account found with the given credentials':
                custom_data['message'] = 'Tên đăng nhập hoặc mật khẩu không chính xác.'

        response.data = custom_data

    return response
