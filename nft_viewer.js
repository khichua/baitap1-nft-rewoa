const Web3 = require('web3');
require('dotenv').config();
const axios = require('axios');

// Khởi tạo kết nối đến mạng BASE Mainnet thông qua Alchemy
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const BASE_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const w3 = new Web3(BASE_RPC_URL);

// Địa chỉ hợp đồng NFT
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

// ABI tối thiểu cho việc truy vấn NFT
const MINIMAL_ABI = [
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
];

function getNftContract() {
    // Khởi tạo đối tượng hợp đồng NFT
    return new w3.eth.Contract(MINIMAL_ABI, NFT_CONTRACT_ADDRESS);
}

async function getNftMetadata(tokenUri) {
    try {
        // Nếu URI bắt đầu bằng 'ipfs://', chuyển đổi thành HTTP URL
        if (tokenUri.startsWith('ipfs://')) {
            tokenUri = `https://ipfs.io/ipfs/${tokenUri.slice(7)}`;
        }
        
        const response = await axios.get(tokenUri);
        return response.data;
    } catch (e) {
        console.log(`Lỗi khi lấy metadata: ${e.message}`);
        return null;
    }
}

async function main() {
    try {
        // Kiểm tra kết nối
        const connected = await w3.eth.net.isListening();
        if (!connected) {
            console.log('Không thể kết nối đến mạng BASE. Vui lòng kiểm tra API key của bạn.');
            return;
        }

        // Yêu cầu người dùng nhập địa chỉ ví
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const walletAddress = await new Promise(resolve => {
            readline.question('Nhập địa chỉ ví Ethereum của bạn: ', resolve);
        });
        readline.close();
        
        // Kiểm tra địa chỉ ví hợp lệ
        if (!w3.utils.isAddress(walletAddress)) {
            console.log('Địa chỉ ví không hợp lệ!');
            return;
        }

        // Khởi tạo hợp đồng
        const contract = getNftContract();

        // Lấy số lượng NFT của ví
        const balance = await contract.methods.balanceOf(walletAddress).call();
        console.log(`\nSố lượng NFT trong ví: ${balance}`);

        if (balance == 0) {
            console.log('Ví này không sở hữu NFT nào trong bộ sưu tập này.');
            return;
        }

        console.log('\nĐang lấy thông tin NFT...');
        
        // Lấy thông tin từng NFT
        for (let i = 0; i < balance; i++) {
            try {
                // Lấy token ID
                const tokenId = await contract.methods.tokenOfOwnerByIndex(walletAddress, i).call();
                
                // Lấy token URI
                const tokenUri = await contract.methods.tokenURI(tokenId).call();
                
                // Lấy metadata
                const metadata = await getNftMetadata(tokenUri);
                
                console.log(`\nNFT #${i + 1}:`);
                console.log(`Token ID: ${tokenId}`);
                if (metadata) {
                    console.log(`Tên: ${metadata.name || 'Không có tên'}`);
                    console.log(`Mô tả: ${metadata.description || 'Không có mô tả'}`);
                    console.log(`Hình ảnh: ${metadata.image || 'Không có hình ảnh'}`);
                } else {
                    console.log('Không thể lấy metadata của NFT');
                }
            } catch (e) {
                console.log(`Lỗi khi lấy thông tin NFT #${i + 1}: ${e.message}`);
            }
        }
    } catch (e) {
        console.log(`Có lỗi xảy ra: ${e.message}`);
    }
}

main();