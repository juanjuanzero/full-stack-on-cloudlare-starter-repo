import { getLink } from '@repo/data-ops/queries/links';
import { linkSchema, LinkSchemaType } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInfo.destinations.default;
	}

	// Check if the country code exists in destinations
	if (linkInfo.destinations[countryCode]) {
		return linkInfo.destinations[countryCode];
	}

	// Fallback to default
	return linkInfo.destinations.default;
}

export function getLinkInfoFromKV(env: Env, linkId: string) {
	const linkInfo = env.CACHE.get(linkId, { type: 'json' }) as Promise<LinkSchemaType | null>;
	if (!linkInfo) {
		return null;
	}
	try {
		const parsed = linkSchema.parse(linkInfo);
		return parsed;
	} catch (error) {
		console.error('Error parsing link info from KV:', error);
		return null;
	}
}

export async function getRoutingDestinations(env: Env, id: string) {
	const linkInfo = await getLinkInfoFromKV(env, id);
	if (linkInfo) {
		return linkInfo;
	}
	const linkInfoFromDb = await getLink(id);
	if (!linkInfoFromDb) {
		return null;
	}
	await saveLinkInfoToKV(env, id, linkInfoFromDb);
	return linkInfoFromDb;
}

const TTL_TIME = 300; // 5 minutes
async function saveLinkInfoToKV(env: Env, linkId: string, linkInfo: LinkSchemaType) {
	try {
		await env.CACHE.put(linkId, JSON.stringify(linkInfo), { expirationTtl: TTL_TIME });
	} catch (error) {
		console.error('Error saving link info to KV:', error);
	}
}

export async function scheduleEvalWorkflow(env: Env, event: LinkClickMessageType) {
	const doId = env.EVALUATION_SCHEDULER.idFromName(`${event.data.id}:${event.data.destination}`);
	const stub = env.EVALUATION_SCHEDULER.get(doId);
	await stub.collectLinkClick(event.data.accountId, event.data.id, event.data.destination, event.data.country || 'UNKNOWN');
}
