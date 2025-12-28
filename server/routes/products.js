import { Router } from 'express';
import db from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all products
router.get('/', (req, res) => {
  try {
    const { category, optimized } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];
    const conditions = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (optimized !== undefined) {
      conditions.push('optimized = ?');
      params.push(optimized === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const products = db.prepare(query).all(...params);
    res.json(products.map(p => ({ ...p, optimized: !!p.optimized })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product stats
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const optimized = db.prepare('SELECT COUNT(*) as count FROM products WHERE optimized = 1').get().count;
    const totalStock = db.prepare('SELECT SUM(stock) as sum FROM products').get().sum || 0;
    const totalViews = db.prepare('SELECT SUM(views) as sum FROM products').get().sum || 0;
    const totalValue = db.prepare('SELECT SUM(price * stock) as sum FROM products').get().sum || 0;

    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(stock) as stock, SUM(views) as views
      FROM products
      GROUP BY category
    `).all();

    res.json({
      total,
      optimized,
      pendingOptimization: total - optimized,
      totalStock,
      totalViews,
      totalValue,
      byCategory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    product.optimized = !!product.optimized;
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', (req, res) => {
  try {
    const { name, sku, price, stock, category, description } = req.body;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO products (id, name, sku, price, stock, category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, sku, price, stock || 0, category, description);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    product.optimized = !!product.optimized;
    res.status(201).json(product);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const { name, sku, price, stock, category, images, optimized, description } = req.body;

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          sku = COALESCE(?, sku),
          price = COALESCE(?, price),
          stock = COALESCE(?, stock),
          category = COALESCE(?, category),
          images = COALESCE(?, images),
          optimized = COALESCE(?, optimized),
          description = COALESCE(?, description),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, sku, price, stock, category, images, optimized !== undefined ? (optimized ? 1 : 0) : null, description, req.params.id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    product.optimized = !!product.optimized;
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment view count
router.post('/:id/view', (req, res) => {
  try {
    db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optimize product images (trigger n8n workflow)
router.post('/:id/optimize', async (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Simulate optimization (in production, trigger n8n workflow)
    setTimeout(() => {
      db.prepare(`
        UPDATE products
        SET optimized = 1,
            images = images + 2,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(req.params.id);
    }, 3000);

    res.json({
      success: true,
      message: 'Image optimization started',
      productId: req.params.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
router.get('/categories/list', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL').all();
    res.json(categories.map(c => c.category));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
