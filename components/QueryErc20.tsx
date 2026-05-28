import { useState, useEffect } from 'react';
import {
    createPublicClient,
    custom,
    getAddress,
    formatUnits,
    erc20Abi,
    type Hex,
    createWalletClient,
    parseUnits,
    encodeFunctionData,
} from 'viem';
import { sepolia } from 'viem/chains';

const TOKEN_ADDRESS = '0xC750F7F0315ea06669916e2FF0344BbcD26CBd66' as const;

export default function TokenBalance() {
    // 钱包相关状态
    const [account, setAccount] = useState<Hex | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 查询相关状态
    const [targetAddress, setTargetAddress] = useState<string>('');
    const [balance, setBalance] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<{
        name: string;
        symbol: string;
        decimals: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [tokenDecimals, setTokenDecimals] = useState<number>(18);
    const [tokenSymbol, setTokenSymbol] = useState<string>('');

    // 创建公共客户端（用于只读查询）
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom(window.ethereum)
    });
    const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
    });
    // 获取代币基本信息（名称、符号、小数位数）
    useEffect(() => {
        async function fetchTokenInfo() {
            try {
                const [name, symbol, decimals] = await Promise.all([
                    publicClient.readContract({
                        address: TOKEN_ADDRESS,
                        abi: erc20Abi,
                        functionName: 'name',
                    }),
                    publicClient.readContract({
                        address: TOKEN_ADDRESS,
                        abi: erc20Abi,
                        functionName: 'symbol',
                    }),
                    publicClient.readContract({
                        address: TOKEN_ADDRESS,
                        abi: erc20Abi,
                        functionName: 'decimals',
                    }),
                ]);
                setTokenInfo({ name, symbol, decimals });
            } catch (err) {
                console.error('获取代币信息失败', err);
            }
        }
        fetchTokenInfo();
    }, [publicClient]);

    // 连接 MetaMask 钱包
    const connectWallet = async () => {
        if (!window.ethereum) {
            setError('请安装 MetaMask 钱包');
            return;
        }
        try {
            const [address] = await window.ethereum.request({
                method: 'eth_requestAccounts',
            });
            const chainIdHex = await window.ethereum.request({
                method: 'eth_chainId',
            });
            const chainIdNum = parseInt(chainIdHex, 16);
            if (chainIdNum !== sepolia.id) {
                setError(`请切换到 Sepolia 测试网（当前网络 ID: ${chainIdNum}）`);
                return;
            }
            setAccount(getAddress(address));
            setChainId(chainIdNum);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    // 查询余额
    const fetchBalance = async (addressToCheck: string) => {
        if (!addressToCheck) return;
        setIsLoading(true);
        try {
            const normalizedAddress = getAddress(addressToCheck);
            const balanceWei = await publicClient.readContract({
                address: TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [normalizedAddress],
            });
            const decimals = tokenInfo?.decimals ?? 18;
            const formattedBalance = formatUnits(balanceWei, decimals);
            setBalance(formattedBalance);
        } catch (err) {
            console.error(err);
            setBalance('查询失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 处理查询按钮点击
    const handleQuery = () => {
        const addressToUse = targetAddress.trim() || account;
        if (!addressToUse) {
            alert('请输入地址或先连接钱包');
            return;
        }
        fetchBalance(addressToUse);
    };

    const handleTransfer = async () => {
        if (!walletClient || !account) {
            alert('请先连接钱包');
            return;
        }
        if (!toAddress || !amount) {
            alert('请输入接收地址和金额');
            return;
        }
        try {
            setIsSending(true);
            const value = parseUnits(amount, tokenDecimals);
            console.log('准备转账', { toAddress, amount: BigInt(amount), value: value.toString() });
            const { request } = await publicClient.simulateContract({
                account,
                address: TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [toAddress as Hex, BigInt(amount)],
            });
            const hash = await walletClient.writeContract(request);
            setTxHash(hash);
            // 等待交易确认（这里补上等待回执）
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
                timeout: 120_000,
                pollingInterval: 3_000,
            });
            const status = (receipt as any).status;
            if (status === 1 || status === 'success') {
                setError(null);
            } else {
                setError('交易失败，区块回执状态异常');
            }
            // 清空输入（可选）
            setToAddress('');
            setAmount('');
        } catch (err) {
            console.error(err);
            const errorMessage =
                err instanceof Error ? err.message :
                    typeof err === 'string' ? err :
                        '未知错误';
            alert(`转账失败: ${errorMessage}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="p-4 border rounded-md max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-2">ERC-20 余额查询</h2>
            <p className="text-sm text-gray-500 mb-4">合约地址: {TOKEN_ADDRESS}</p>

            {/* 钱包连接部分 */}
            {!account ? (
                <button
                    onClick={connectWallet}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    连接 MetaMask
                </button>
            ) : (
                <div className="mb-4">
                    <p className="text-green-700">✅ 已连接钱包</p>
                    <p className="text-sm break-all">地址: {account}</p>
                </div>
            )}

            {error && <p className="text-red-600 mb-2">{error}</p>}

            {/* 查询部分 */}
            <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                    要查询的地址 (留空则使用当前钱包地址)
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="0x..."
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        className="flex-1 border rounded p-2"
                    />
                    <button
                        onClick={handleQuery}
                        disabled={isLoading}
                        className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                        {isLoading ? '查询中...' : '查询余额'}
                    </button>
                </div>
            </div>

            {/* 显示结果 */}
            {balance !== null && tokenInfo && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                    <p>
                        <strong>代币名称:</strong> {tokenInfo.name}
                    </p>
                    <p>
                        <strong>代币符号:</strong> {tokenInfo.symbol}
                    </p>
                    <p>
                        <strong>余额:</strong> {balance} {tokenInfo.symbol}
                    </p>
                </div>
            )}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-1">接收地址</label>
                <input
                    type="text"
                    placeholder="0x..."
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="w-full border rounded p-2 mb-3"
                />
                <label className="block text-sm font-medium mb-1">金额 ({tokenSymbol})</label>
                <input
                    type="text"
                    placeholder="例如: 10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border rounded p-2 mb-3"
                />
                <button
                    onClick={handleTransfer}
                    disabled={isSending}
                    className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                >
                    {isSending ? '转账中...' : '转账'}
                </button>
                {txHash && (
                    <p className="mt-2 text-sm">
                        交易哈希:{' '}
                        <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500"
                        >
                            {txHash.slice(0, 10)}...
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
}