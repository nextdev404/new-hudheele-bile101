INSERT INTO categories (slug, name, icon, sort_order) VALUES
  ('breakfast', 'Breakfast', 'fa-egg', 1),
  ('soups', 'Soups', 'fa-mug-hot', 2),
  ('main', 'Main Course', 'fa-bowl-food', 3),
  ('burger', 'Burgers', 'fa-burger', 4),
  ('drinks', 'Drinks', 'fa-glass-water', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, price, image, available_quantity, availability_status)
SELECT c.id, p.name, p.price, p.image, p.qty, 'in_stock'
FROM (
  VALUES
  ('burger', 'Original Chess Meat Burger With Chips', 23.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400', 100),
  ('breakfast', 'Fresh Orange Juice With Basil Seed', 12.99, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=400', 100),
  ('main', 'Tacos Salsa With Chickens Grilled', 14.99, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=400', 100),
  ('soups', 'Tasty Vegetable Salad Healthy', 17.99, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=400', 100)
) AS p(slug, name, price, image, qty)
JOIN categories c ON c.slug = p.slug
ON CONFLICT DO NOTHING;

INSERT INTO tables (table_code, display_name, status) VALUES
  ('T1', 'Available', 'Available'),
  ('T2', 'Available', 'Available'),
  ('T3', 'Available', 'Available'),
  ('T4', 'Available', 'Available'),
  ('T5', 'Available', 'Available'),
  ('T6', 'Available', 'Available')
ON CONFLICT (table_code) DO NOTHING;
