import { useAccount, useChains, useSwitchChain } from "wagmi"
import styles from '../styles/Home.module.css';

const NetworkSwitcher = () => {
  const { chain, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const chains = useChains()
  console.log({ chain, chains }, 'chain')
  return (
    <div>
      <div>Current ChainId: {chainId}</div>
      <div>Current Chain name: {chain?.name}</div>
      {
        isConnected && <div className={styles.options}>
          {
            chains.filter(v => v.id !== chainId).map(v => <button
              onClick={() => switchChain({ chainId: v.id })}
              key={v.id}>
              switch to {v.name}
            </button>)
          }
        </div>
      }
    </div>
  )
}

export default NetworkSwitcher;