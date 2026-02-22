import { createClient } from '@supabase/supabase-js';
import RelatedProducts from './RelatedProducts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function RelatedProductsWrapper({
    productId,
    embedding
}: {
    productId: number;
    embedding: any;
}) {
    if (!embedding) return null;

    try {
        const { data: related } = await supabaseAdmin.rpc('match_products', {
            query_embedding: embedding,
            match_threshold: 0.4,
            match_count: 16,
            current_product_id: productId
        });

        if (!related || related.length === 0) return null;

        return <RelatedProducts products={related} />;
    } catch (error) {
        console.error("Error fetching related products:", error);
        return null;
    }
}
