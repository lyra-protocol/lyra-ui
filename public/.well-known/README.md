# .well-known

`agent-registration.json` is Lyra's ERC-8004 agent card.

Serving it from this domain is what proves the agent behind her `agentId`
controls lyrabuild.xyz. Without it she is an anonymous NFT; with it, the
identity, both public pages, the MCP server and eventually the Arweave ledger
are provably one entity.

`registrations` stays empty until she is minted, then carries:

    { "agentRegistry": "eip155:1:0x8004A818BFB912233c491871b3d84c89A494BD9e",
      "agentId": "<tokenId>" }

The registry is an ERC-721, so the address holding that token *is* Lyra. Treat
its key accordingly: it is a separate concern from the venue signing key and
must not share a machine with it.
