import { getDestinationForCountry, getRoutingDestinations } from '@/helpers/routing-ops';
import { getLink } from '@repo/data-ops/queries/links';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	const id = c.req.param('id');
	const linkInfoFromDb = await getRoutingDestinations(c.env, id);
	if (!linkInfoFromDb) {
		return c.json({ error: 'Link not found' }, 404);
	}

	const cfHeaders = cloudflareInfoSchema.safeParse(c.req.raw.cf);
	if (!cfHeaders.success) {
		console.log(cfHeaders.error);
		return c.json({ error: 'Error Parsing Cloudflare Headers' }, 400);
	}

	const headers = cfHeaders.data;
	const destination = getDestinationForCountry(linkInfoFromDb, headers.country);
	const queueMessage: LinkClickMessageType = {
		type: 'LINK_CLICK',
		data: {
			id: id,
			country: headers.country,
			destination: destination,
			accountId: linkInfoFromDb.accountId,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Date().toISOString(),
		},
	};
	c.executionCtx.waitUntil(c.env.QUEUE.send(queueMessage));
	return c.redirect(destination);
});
