export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  priceBz: number;
  category: 'PROMOÇÕES' | 'PRATOS DA CASA' | 'COMIDAS' | 'BEBIDAS';
}

export const MENU_ITEMS: MenuItem[] = [
  // PROMOÇÕES
  { id: 'p1', category: 'PROMOÇÕES', name: 'Kanelbullar com Kaffe ou Koldskål', priceBz: 28 },
  { id: 'p2', category: 'PROMOÇÕES', name: 'Far I Kat com Olut', priceBz: 18 },
  { id: 'p3', category: 'PROMOÇÕES', name: 'Skause de Skallheim com Mjød', priceBz: 23 },
  
  // PRATOS DA CASA
  { id: 'pc1', category: 'PRATOS DA CASA', name: 'Skause de Skallheim: Carne de Porco Temperada', priceBz: 15 },
  { id: 'pc2', category: 'PRATOS DA CASA', name: 'Fisk stuvad i öl: Peixe com Cerveja', priceBz: 14 },
  
  // COMIDAS
  { id: 'c1', category: 'COMIDAS', name: 'Kanelbullar: Pão com Canela', priceBz: 18 },
  { id: 'c2', category: 'COMIDAS', name: 'Grønnsaker med honning: Legumes com Mel', priceBz: 9 },
  { id: 'c3', category: 'COMIDAS', name: 'Far I Kat: Carne com Repolho', priceBz: 9 },
  { id: 'c4', category: 'COMIDAS', name: 'Gravlax: Sopa de Peixe', priceBz: 9 },
  { id: 'c5', category: 'COMIDAS', name: 'Syltede Sild: Carne de Porco Acebolada', priceBz: 14 },
  { id: 'c6', category: 'COMIDAS', name: 'Blåbärssoppa: Sopa de Mirtilo', priceBz: 8 },
  
  // BEBIDAS
  { id: 'b1', category: 'BEBIDAS', name: 'Mjød: Hidromel', priceBz: 10 },
  { id: 'b2', category: 'BEBIDAS', name: 'Vinho de Frutas', priceBz: 12 },
  { id: 'b3', category: 'BEBIDAS', name: 'Olut: Cerveja', priceBz: 10 },
  { id: 'b4', category: 'BEBIDAS', name: 'Aquavit', priceBz: 10 },
  { id: 'b5', category: 'BEBIDAS', name: 'Koldskål: Bebida de cacau gelado', priceBz: 12 },
  { id: 'b6', category: 'BEBIDAS', name: 'Myntate: Chá de Hortelã', priceBz: 8 },
  { id: 'b7', category: 'BEBIDAS', name: 'Kaffe', priceBz: 9 },
];

export interface IngredientRequirement {
  name: string;
  amount: number;
}

export interface Recipe {
  menuItemId: string;
  ingredients: IngredientRequirement[];
}

export const RECIPES: Recipe[] = [
  {
    menuItemId: 'pc2', // Fisk stuvad i öl
    ingredients: [
      { name: 'Cebola', amount: 2 },
      { name: 'Batata', amount: 2 },
      { name: 'Mel', amount: 2 },
      { name: 'Especiaria', amount: 5 },
    ]
  },
  {
    menuItemId: 'c1', // Kanelbullar
    ingredients: [
      { name: 'Fermento', amount: 5 },
      { name: 'Lúpulo', amount: 5 },
      { name: 'Semente', amount: 5 },
      { name: 'Cacau', amount: 2 },
    ]
  },
  {
    menuItemId: 'c2', // Grønnsaker med honning
    ingredients: [
      { name: 'Cenoura', amount: 2 },
      { name: 'Abóbora', amount: 1 },
      { name: 'Mel', amount: 5 },
      { name: 'Especiaria', amount: 5 },
    ]
  },
  {
    menuItemId: 'c3', // Far i Kat
    ingredients: [
      { name: 'Trigo', amount: 2 },
      { name: 'Salsinha', amount: 2 },
      { name: 'Carne Saborosa', amount: 1 },
    ]
  },
  {
    menuItemId: 'c4', // Gravlax
    ingredients: [
      { name: 'Peixe exótico', amount: 1 },
      { name: 'Sal', amount: 5 },
      { name: 'Ranch Watee', amount: 2 },
      { name: 'Salsinha', amount: 3 },
    ]
  },
  {
    menuItemId: 'c5', // Syltede Sild
    ingredients: [
      { name: 'Carne de Porco', amount: 2 },
      { name: 'Cebola', amount: 2 },
      { name: 'Pepino', amount: 2 },
      { name: 'Salsinha', amount: 5 },
    ]
  },
  {
    menuItemId: 'c6', // Blåbärssoppa
    ingredients: [
      { name: 'Frutinha das Terras Altas', amount: 5 },
      { name: 'Mirtilo', amount: 2 },
      { name: 'Mel', amount: 5 },
      { name: 'Alface', amount: 2 },
    ]
  },
  {
    menuItemId: 'b4', // Aquavit
    ingredients: [
      { name: 'Trigo', amount: 1 },
      { name: 'Batata', amount: 2 },
      { name: 'Água purificada', amount: 5 },
    ]
  },
  {
    menuItemId: 'b7', // Kaffe
    ingredients: [
      { name: 'Café', amount: 3 },
      { name: 'Água purificada', amount: 5 },
    ]
  },
  {
    menuItemId: 'b5', // Koldskål
    ingredients: [
      { name: 'Leite', amount: 1 },
      { name: 'Gelo', amount: 5 },
      { name: 'Cacau', amount: 2 },
    ]
  },
  {
    menuItemId: 'b1', // Mjød
    ingredients: [
      { name: 'Mel', amount: 2 },
      { name: 'Água purificada', amount: 2 },
      { name: 'Fermento', amount: 5 },
    ]
  },
  {
    menuItemId: 'b6', // Myntate
    ingredients: [
      { name: 'Chá', amount: 2 },
      { name: 'Hortelã', amount: 2 },
      { name: 'Água purificada', amount: 2 },
    ]
  },
  {
    menuItemId: 'b3', // Olut
    ingredients: [
      { name: 'Trigo', amount: 3 },
      { name: 'Lúpulo', amount: 5 },
      { name: 'Água purificada', amount: 2 },
    ]
  },
  {
    menuItemId: 'b2', // Vinho de fruta
    ingredients: [
      { name: 'Frutinha das Terras Altas', amount: 5 },
      { name: 'Fermento', amount: 5 },
      { name: 'Água purificada', amount: 2 },
      { name: 'Açúcar', amount: 5 },
    ]
  }
];

export const ALL_INGREDIENTS = Array.from(
  new Set(RECIPES.flatMap(r => r.ingredients.map(i => i.name)))
).sort();
