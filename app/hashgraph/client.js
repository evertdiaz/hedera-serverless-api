import {
	Client,
	MirrorClient,
	Ed25519PrivateKey,
	Ed25519PublicKey,
	AccountBalanceQuery,
	ConsensusTopicInfoQuery,
	MirrorConsensusTopicQuery,
	ConsensusTopicCreateTransaction,
	ConsensusMessageSubmitTransaction
} from "@hashgraph/sdk"
import HashgraphClientContract from "./contract"
import HashgraphNodeNetwork from "./network"
import Config from "app/config"
import sleep from "app/utils/sleep"

class HashgraphClient extends HashgraphClientContract {
	// Keep a private internal reference to SDK client
	#client

	constructor() {
		super()

		this.#client = HashgraphNodeNetwork.getNodeNetworkClient()
	}

	/**
	 * Skipping the admin signing of the transaction as this API is accessed through an authKey
	 **/
	async createNewTopic({ memo, enable_private_submit_key }) {
		const client = this.#client
		const transactionResponse = {}

		// TODO: This is used for submitting messages to hedera with the recorded public key
		// const rawPublicKey = "302a300506032b657003210034314146f2f694822547af9007baa32fcc5a6962e7c5141333846a6cf04b64ca"
		// const submitPublicKey = Ed25519PublicKey.fromString(rawPublicKey)
		// console.log(submitPublicKey.toString());

		const transaction = new ConsensusTopicCreateTransaction()

		if (memo) {
			transactionResponse.memo = memo
			transaction.setTopicMemo(memo)
		}

		// This doesn't seem to be working
		if (enable_private_submit_key) {
			const submitKey = await Ed25519PrivateKey.generate()
			const submitPublicKey = submitKey.publicKey

			transaction.setSubmitKey(submitPublicKey)

			// The ordering of this is vital as the toString() method mutates the public key.
			transactionResponse.submitPublicKey = submitPublicKey.toString()
		}

		const transactionId = await transaction.execute(client)

		// Is this required?
		await sleep()

		const receipt = await transactionId.getReceipt(client)
		const topicId = receipt.getConsensusTopicId()

		const { shard, realm, topic } = topicId
		return {
			...transactionResponse,
			topic: `${shard}.${realm}.${topic}`
		}
	}

	async getTopicInfo(topicId) {
		const client = this.#client
		const topic = await new ConsensusTopicInfoQuery()
			.setTopicId(topicId)
			.execute(client)

		return topic
	}

	async accountBalanceQuery() {
		const client = this.#client

		const balance = await new AccountBalanceQuery()
			.setAccountId(Config.accountId)
			.execute(client)

		return { balance: balance.toString() }
	}
}

export default HashgraphClient
