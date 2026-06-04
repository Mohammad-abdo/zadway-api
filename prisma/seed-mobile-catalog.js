/**
 * Rich mobile catalog seed — many categories, products, variants for Zadway UI testing.
 * Run: node prisma/seed-mobile-catalog.js  (from api/ directory)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: "مياه الشرب",
    nameI18n: { en: "Drinking Water", ar: "مياه الشرب" },
    description: "مياه نقية للشرب اليومي",
    image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
  },
  {
    name: "مياه معدنية",
    nameI18n: { en: "Mineral Water", ar: "مياه معدنية" },
    description: "مياه معدنية طبيعية من ينابيع نقية",
    image_url: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
  },
  {
    name: "مياه عذبة",
    nameI18n: { en: "Purified Water", ar: "مياه عذبة" },
    description: "مياه مفلترة ومعالجة بأعلى المعايير",
    image_url: "https://images.unsplash.com/photo-1523362628745-0c100171e518?w=800&q=80",
  },
  {
    name: "مياه غازية",
    nameI18n: { en: "Sparkling Water", ar: "مياه غازية" },
    description: "مياه فوارة منعشة بطعم طبيعي",
    image_url: "https://images.unsplash.com/photo-1617451727285-7f1e9f76cb3b?w=800&q=80",
  },
  {
    name: "مياه جبلية",
    nameI18n: { en: "Mountain Spring Water", ar: "مياه جبلية" },
    description: "مياه ينبوعية من أعالي الجبال",
    image_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
  },
  {
    name: "عبوات كبيرة",
    nameI18n: { en: "Large Containers", ar: "عبوات كبيرة" },
    description: "صفائح وعبوات كبيرة للمنازل والمكاتب",
    image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
  },
  {
    name: "عروض خاصة",
    nameI18n: { en: "Special Offers", ar: "عروض خاصة" },
    description: "أفضل العروض والباقات المميزة",
    image_url: "https://images.unsplash.com/photo-1616116214959-51e0aa9b6eaf?w=800&q=80",
  },
  {
    name: "مياه الأطفال",
    nameI18n: { en: "Kids Water", ar: "مياه الأطفال" },
    description: "مياه آمنة ومعالجة خصيصاً للأطفال",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
];

const PRODUCTS = [
  {
    categoryIndex: 0,
    name: "مياه قرورة للشرب",
    nameI18n: { en: "Qarora Drinking Water", ar: "مياه قرورة للشرب" },
    description: "مياه نقية للشرب اليومي. محكمة الإغلاق، قابلة للتتبع.",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
    variants: [
      { name: "٣٣٠ مل", price: 500, stock: 200, sku: "QD-330" },
      { name: "٦٠٠ مل", price: 750, stock: 150, sku: "QD-600" },
      { name: "١.٥ لتر", price: 1000, stock: 100, sku: "QD-1500" },
    ],
  },
  {
    categoryIndex: 0,
    name: "مياه زمزم المعبأة",
    nameI18n: { en: "Zamzam Packaged Water", ar: "مياه زمزم المعبأة" },
    description: "مياه مستوردة معبأة بعناية خاصة.",
    imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100171e518?w=800&q=80",
    variants: [
      { name: "٥٠٠ مل", price: 2000, stock: 80, sku: "ZZ-500" },
      { name: "١ لتر", price: 3500, stock: 50, sku: "ZZ-1000" },
    ],
  },
  {
    categoryIndex: 1,
    name: "مياه دجلة المعدنية",
    nameI18n: { en: "Dijla Mineral Water", ar: "مياه دجلة المعدنية" },
    description: "مياه معدنية طبيعية غنية بالمعادن الأساسية للجسم.",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    variants: [
      { name: "٣٣٠ مل", price: 600, stock: 300, sku: "DM-330" },
      { name: "٥٠٠ مل", price: 900, stock: 200, sku: "DM-500" },
      { name: "١.٥ لتر", price: 1500, stock: 120, sku: "DM-1500" },
    ],
  },
  {
    categoryIndex: 1,
    name: "مياه البحيرة الطبيعية",
    nameI18n: { en: "Lake Natural Mineral", ar: "مياه البحيرة الطبيعية" },
    description: "مستخرجة من بحيرات طبيعية نقية في شمال العراق.",
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    variants: [
      { name: "٥٠٠ مل", price: 800, stock: 180, sku: "LK-500" },
      { name: "١ لتر", price: 1200, stock: 100, sku: "LK-1000" },
    ],
  },
  {
    categoryIndex: 2,
    name: "مياه صافية المفلترة",
    nameI18n: { en: "Safi Purified Water", ar: "مياه صافية المفلترة" },
    description: "مفلترة بتقنية التناضح العكسي وصادقة على مواصفات WHO.",
    imageUrl: "https://images.unsplash.com/photo-1616116214959-51e0aa9b6eaf?w=800&q=80",
    variants: [
      { name: "٣٣٠ مل", price: 400, stock: 500, sku: "SF-330" },
      { name: "٦٠٠ مل", price: 650, stock: 350, sku: "SF-600" },
      { name: "١.٥ لتر", price: 900, stock: 200, sku: "SF-1500" },
    ],
  },
  {
    categoryIndex: 3,
    name: "مياه فوارة بالنكهات",
    nameI18n: { en: "Flavored Sparkling Water", ar: "مياه فوارة بالنكهات" },
    description: "فوارة منعشة بنكهات الحمضيات الطبيعية.",
    imageUrl: "https://images.unsplash.com/photo-1617451727285-7f1e9f76cb3b?w=800&q=80",
    variants: [
      { name: "٣٣٠ مل ليمون", price: 1200, stock: 150, sku: "SP-LM-330" },
      { name: "٣٣٠ مل توت", price: 1200, stock: 150, sku: "SP-BB-330" },
      { name: "٥٠٠ مل مشكل", price: 1800, stock: 80, sku: "SP-MX-500" },
    ],
  },
  {
    categoryIndex: 3,
    name: "مياه كلوبسودا الفوارة",
    nameI18n: { en: "Club Soda Sparkling", ar: "مياه كلوبسودا الفوارة" },
    description: "فوارة نقية مثالية للمشروبات.",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
    variants: [
      { name: "٣٣٠ مل", price: 800, stock: 200, sku: "CS-330" },
      { name: "١ لتر", price: 1500, stock: 100, sku: "CS-1000" },
    ],
  },
  {
    categoryIndex: 4,
    name: "مياه جبال كردستان",
    nameI18n: { en: "Kurdistan Mountain Spring", ar: "مياه جبال كردستان" },
    description: "من أعالي جبال كردستان، نقية وطبيعية 100%.",
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    variants: [
      { name: "٥٠٠ مل", price: 1000, stock: 120, sku: "KS-500" },
      { name: "١ لتر", price: 1800, stock: 80, sku: "KS-1000" },
      { name: "١.٥ لتر", price: 2500, stock: 60, sku: "KS-1500" },
    ],
  },
  {
    categoryIndex: 5,
    name: "صفيحة مياه ١٩ لتر",
    nameI18n: { en: "19L Water Dispenser Jug", ar: "صفيحة مياه ١٩ لتر" },
    description: "صفيحة بلاستيكية شفافة ٢٠ لتر مع غطاء محكم، للمنازل والمكاتب.",
    imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100171e518?w=800&q=80",
    variants: [
      { name: "١٩ لتر", price: 5000, stock: 50, sku: "JG-19" },
      { name: "١٩ لتر معدنية", price: 6500, stock: 30, sku: "JG-19M" },
    ],
  },
  {
    categoryIndex: 5,
    name: "كيس مياه ٥ لتر",
    nameI18n: { en: "5L Water Bag", ar: "كيس مياه ٥ لتر" },
    description: "أكياس محكمة ٥ لتر عملية وسهلة الحمل.",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
    variants: [
      { name: "٥ لتر", price: 2000, stock: 200, sku: "BG-5" },
      { name: "١٠ لتر", price: 3500, stock: 100, sku: "BG-10" },
    ],
  },
  {
    categoryIndex: 6,
    name: "باقة الأسرة الأسبوعية",
    nameI18n: { en: "Family Weekly Pack", ar: "باقة الأسرة الأسبوعية" },
    description: "٤ × ١٩ لتر + ٢٠ × ٣٣٠ مل. توفير ٢٥٪ من السعر العادي!",
    imageUrl: "https://images.unsplash.com/photo-1616116214959-51e0aa9b6eaf?w=800&q=80",
    variants: [
      { name: "باقة أسبوعية", price: 18000, stock: 20, sku: "PK-FAM-W" },
    ],
  },
  {
    categoryIndex: 6,
    name: "باقة المكتب الشهرية",
    nameI18n: { en: "Office Monthly Pack", ar: "باقة المكتب الشهرية" },
    description: "توصيل ١٢ × ١٩ لتر شهرياً. مناسب للمكاتب الصغيرة والمتوسطة.",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80",
    variants: [
      { name: "باقة شهرية", price: 55000, stock: 15, sku: "PK-OFF-M" },
    ],
  },
  {
    categoryIndex: 7,
    name: "مياه الأطفال الطبيعية",
    nameI18n: { en: "Pure Kids Natural Water", ar: "مياه الأطفال الطبيعية" },
    description: "مياه نقية منخفضة الأملاح خاصة للأطفال والرضع.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    variants: [
      { name: "٢٠٠ مل", price: 500, stock: 400, sku: "KD-200" },
      { name: "٣٣٠ مل", price: 700, stock: 300, sku: "KD-330" },
    ],
  },
];

const SIZE_DEFS = [
  { id: 10, name: "330ml", nameAr: "٣٣٠ مل", nameI18n: { en: "330 ml", ar: "٣٣٠ مل" } },
  { id: 11, name: "500ml", nameAr: "٥٠٠ مل", nameI18n: { en: "500 ml", ar: "٥٠٠ مل" } },
  { id: 12, name: "600ml", nameAr: "٦٠٠ مل", nameI18n: { en: "600 ml", ar: "٦٠٠ مل" } },
  { id: 13, name: "1L", nameAr: "١ لتر", nameI18n: { en: "1 Liter", ar: "١ لتر" } },
  { id: 14, name: "1.5L", nameAr: "١.٥ لتر", nameI18n: { en: "1.5 Liter", ar: "١.٥ لتر" } },
  { id: 15, name: "5L", nameAr: "٥ لتر", nameI18n: { en: "5 Liter", ar: "٥ لتر" } },
  { id: 16, name: "10L", nameAr: "١٠ لتر", nameI18n: { en: "10 Liter", ar: "١٠ لتر" } },
  { id: 17, name: "19L", nameAr: "١٩ لتر", nameI18n: { en: "19 Liter", ar: "١٩ لتر" } },
  { id: 18, name: "19L-M", nameAr: "١٩ لتر معدنية", nameI18n: { en: "19L Mineral", ar: "١٩ لتر معدنية" } },
  { id: 19, name: "200ml", nameAr: "٢٠٠ مل", nameI18n: { en: "200 ml", ar: "٢٠٠ مل" } },
  { id: 20, name: "Weekly", nameAr: "أسبوعي", nameI18n: { en: "Weekly Pack", ar: "باقة أسبوعية" } },
  { id: 21, name: "Monthly", nameAr: "شهري", nameI18n: { en: "Monthly Pack", ar: "باقة شهرية" } },
  { id: 22, name: "330ml-B", nameAr: "٣٣٠ مل توت", nameI18n: { en: "330 ml Berry", ar: "٣٣٠ مل توت" } },
  { id: 23, name: "330ml-L", nameAr: "٣٣٠ مل ليمون", nameI18n: { en: "330 ml Lemon", ar: "٣٣٠ مل ليمون" } },
];

// map sku suffix → size id
const SKU_SIZE = {
  "QD-330": 10, "QD-600": 12, "QD-1500": 14,
  "ZZ-500": 11, "ZZ-1000": 13,
  "DM-330": 10, "DM-500": 11, "DM-1500": 14,
  "LK-500": 11, "LK-1000": 13,
  "SF-330": 10, "SF-600": 12, "SF-1500": 14,
  "SP-LM-330": 23, "SP-BB-330": 22, "SP-MX-500": 11,
  "CS-330": 10, "CS-1000": 13,
  "KS-500": 11, "KS-1000": 13, "KS-1500": 14,
  "JG-19": 17, "JG-19M": 18,
  "BG-5": 15, "BG-10": 16,
  "PK-FAM-W": 20, "PK-OFF-M": 21,
  "KD-200": 19, "KD-330": 10,
};

async function upsertSizes() {
  for (const s of SIZE_DEFS) {
    await prisma.size.upsert({ where: { id: s.id }, update: s, create: s });
  }
}

async function upsertType() {
  const existing = await prisma.productType.findFirst({ where: { name: "Water" } });
  if (existing) return existing;
  return prisma.productType.create({ data: { name: "Water", nameAr: "مياه" } });
}

async function main() {
  console.log("🌊 Seeding mobile catalog...");

  await upsertSizes();
  const type = await upsertType();

  const categories = [];
  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (existing) {
      categories.push(existing);
      console.log(`  ✓ category exists: ${cat.name}`);
    } else {
      const c = await prisma.category.create({ data: cat });
      categories.push(c);
      console.log(`  + created category: ${cat.name}`);
    }
  }

  for (const pd of PRODUCTS) {
    const cat = categories[pd.categoryIndex];
    if (!cat) { console.warn(`  ⚠ category index ${pd.categoryIndex} not found`); continue; }

    let product = await prisma.product.findFirst({ where: { name: pd.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: pd.name,
          nameI18n: pd.nameI18n,
          description: pd.description,
          categoryId: cat.id,
          imageUrl: pd.imageUrl,
          images: [pd.imageUrl],
          isActive: true,
        },
      });
      console.log(`  + created product: ${pd.name}`);
    } else {
      console.log(`  ✓ product exists: ${pd.name}`);
    }

    for (const v of pd.variants) {
      const existing = await prisma.productVariant.findFirst({ where: { sku: v.sku } });
      if (!existing) {
        const sizeId = SKU_SIZE[v.sku] ?? 10;
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sizeId,
            typeId: type.id,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            imageUrl: pd.imageUrl,
            currency: "IQD",
          },
        });
        console.log(`    + variant: ${v.name} (${v.price} IQD)`);
      }
    }
  }

  console.log(`\n✅ Seeded ${CATEGORIES.length} categories, ${PRODUCTS.length} products`);
  console.log("   Test accounts:");
  console.log("   Rider  → email: customer@qarora.local  / password: password");
  console.log("   Driver → email: driver@qarora.com      / password: password");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
