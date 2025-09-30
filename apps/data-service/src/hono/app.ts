import { getDestinationForCountry } from "@/helpers/routing-ops";
import { getLink } from "@repo/data-ops/queries/links";
import { cloudflareInfoSchema } from "@repo/data-ops/zod-schema/links";
import {Hono} from "hono";

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
 
    const linkInfoFromDb = await getLink(c.req.param('id'));
    if (!linkInfoFromDb) {
        return c.json({ error: 'Link not found' }, 404);
    }

    const cfHeaders = cloudflareInfoSchema.safeParse(c.req.raw.cf);
    if (!cfHeaders.success) {
        console.log(cfHeaders.error);
        return c.json({ error: 'Error Parsing Cloudflare Headers' }, 400);
    }

    const headers = cfHeaders.data;
    const destinations = getDestinationForCountry(linkInfoFromDb, headers.country);
    return c.redirect(destinations
    ) 
})