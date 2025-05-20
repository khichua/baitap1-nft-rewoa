from web3 import Web3
from dotenv import load_dotenv
import os
import json
import requests

# Tải các biến môi trường từ file .env
load_dotenv()

# Khởi tạo kết nối đến mạng BASE Mainnet thông qua Alchemy
ALCHEMY_API_KEY = os.getenv('ALCHEMY_API_KEY')
BASE_RPC_URL = f'https://base-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}'
w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))

# Địa chỉ hợp đồng NFT
NFT_CONTRACT_ADDRESS = os.getenv('NFT_CONTRACT_ADDRESS')

# ABI tối thiểu cho việc truy vấn NFT
MINIMAL_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "uint256", "name": "index", "type": "uint256"}],
        "name": "tokenOfOwnerByIndex",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def get_nft_contract():
    """Khởi tạo đối tượng hợp đồng NFT"""
    return w3.eth.contract(address=NFT_CONTRACT_ADDRESS, abi=MINIMAL_ABI)

def get_nft_metadata(token_uri):
    """Lấy metadata của NFT từ URI"""
    try:
        # Nếu URI bắt đầu bằng 'ipfs://', chuyển đổi thành HTTP URL
        if token_uri.startswith('ipfs://'):
            token_uri = f'https://ipfs.io/ipfs/{token_uri[7:]}'
        
        response = requests.get(token_uri)
        return response.json()
    except Exception as e:
        print(f'Lỗi khi lấy metadata: {e}')
        return None

def main():
    # Kiểm tra kết nối
    if not w3.is_connected():
        print('Không thể kết nối đến mạng BASE. Vui lòng kiểm tra API key của bạn.')
        return

    # Yêu cầu người dùng nhập địa chỉ ví
    wallet_address = input('Nhập địa chỉ ví Ethereum của bạn: ')
    
    # Kiểm tra địa chỉ ví hợp lệ
    if not w3.is_address(wallet_address):
        print('Địa chỉ ví không hợp lệ!')
        return

    # Khởi tạo hợp đồng
    contract = get_nft_contract()

    try:
        # Lấy số lượng NFT của ví
        balance = contract.functions.balanceOf(wallet_address).call()
        print(f'\nSố lượng NFT trong ví: {balance}')

        if balance == 0:
            print('Ví này không sở hữu NFT nào trong bộ sưu tập này.')
            return

        print('\nĐang lấy thông tin NFT...')
        
        # Lấy thông tin từng NFT
        for i in range(balance):
            try:
                # Lấy token ID
                token_id = contract.functions.tokenOfOwnerByIndex(wallet_address, i).call()
                
                # Lấy token URI
                token_uri = contract.functions.tokenURI(token_id).call()
                
                # Lấy metadata
                metadata = get_nft_metadata(token_uri)
                
                print(f'\nNFT #{i + 1}:')
                print(f'Token ID: {token_id}')
                if metadata:
                    print(f'Tên: {metadata.get("name", "Không có tên")}')
                    print(f'Mô tả: {metadata.get("description", "Không có mô tả")}')
                    print(f'Hình ảnh: {metadata.get("image", "Không có hình ảnh")}')
                else:
                    print('Không thể lấy metadata của NFT')
                    
            except Exception as e:
                print(f'Lỗi khi lấy thông tin NFT #{i + 1}: {e}')

    except Exception as e:
        print(f'Có lỗi xảy ra: {e}')

if __name__ == '__main__':
    main()