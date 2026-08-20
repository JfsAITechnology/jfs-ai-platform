// Tenant data access layer. All tenant-scoped queries use the fixed tenant UUID from tenant.config.js.
(function () {
  const sb = () => window.JFS_SUPABASE;
  const tenantId = () => window.JFS_TENANT.supabaseTenantId;

  window.JFS_TENANT_SERVICE = Object.freeze({
    async getTenant() {
      const { data, error } = await sb().from('tenants').select('*').eq('id', tenantId()).single();
      if (error) throw error;
      return data;
    },
    async getProducts() {
      const { data, error } = await sb().from('products')
        .select('id,sku,name,category,description,price,image_url,image_path,is_active')
        .eq('tenant_id', tenantId()).eq('is_active', true).order('created_at');
      if (error) throw error;
      return data || [];
    },
    async getKnowledge() {
      const { data, error } = await sb().from('jfs_knowledge')
        .select('id,category,title,content,is_active,created_at,updated_at')
        .eq('tenant_id', tenantId()).eq('is_active', true).order('created_at');
      if (error) return [];
      return data || [];
    }
  });
})();
