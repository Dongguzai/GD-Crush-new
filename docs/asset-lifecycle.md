# Asset Lifecycle

| Asset type | Visibility | Written when | Deleted when | Required audit |
| --- | --- | --- | --- | --- |
| Reference image | Temporary | User uploads a reference image | Character generation completes and storage deletion succeeds | `image_deleted` |
| Speech input audio | Temporary | User uploads a voice clip for STT | STT completes; deletion is required before a successful response | None |
| Generated visual asset | Public persisted asset | Character or scene generation completes | User destroys the Crush | None |
| Generated TTS output | Public persisted asset | Speech synthesis completes | User destroys the Crush | None |

Implementation notes:

- Local storage and R2 use the same `StorageService` contract.
- Storage deletions are retried before a lifecycle transition is considered successful.
- Reference-image materials are marked `deleted` only after the underlying object is actually removed.
- If reference-image cleanup or destroy cleanup still fails after retries, the API surfaces a failure instead of silently reporting success.
- Temporary speech input does not emit an audit event so the system avoids retaining extra metadata for transient recordings.
