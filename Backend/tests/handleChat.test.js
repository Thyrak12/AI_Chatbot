import { handleChat } from "../src/services/chatbot_service.js";
import { detectMessage } from "../src/modules/ai_engine.js";
import { searchMenuItems, getMenusByRestaurantId } from "../src/services/menu_service.js";
import { getPromotionsByRestaurantId } from "../src/services/promotion_service.js";

jest.mock("../src/modules/ai_engine.js");
jest.mock("../src/services/menu_service.js");
jest.mock("../src/services/promotion_service.js");

describe("handleChat", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return menu items for a menu_search intent", async () => {
    detectMessage.mockResolvedValue({
      intent: "menu_search",
      collection: "menus",
      filters: { name: { $regex: "pizza" } },
      metadata: { limit: 5 },
    });

    searchMenuItems.mockResolvedValue([
      { name: "Pepperoni Pizza", price: 12.99 },
      { name: "Margherita Pizza", price: 10.99 },
    ]);

    const response = await handleChat("Show me pizza", "test-session-id");

    expect(response).toBe("- Pepperoni Pizza: $12.99\n- Margherita Pizza: $10.99");
    expect(detectMessage).toHaveBeenCalledWith("Show me pizza");
    expect(searchMenuItems).toHaveBeenCalledWith("pizza", 5);
  });

  it("should return menus for a restaurant_search intent", async () => {
    detectMessage.mockResolvedValue({
      intent: "restaurant_search",
      collection: "restaurants",
      filters: { restaurantId: "123" },
      metadata: {},
    });

    getMenusByRestaurantId.mockResolvedValue([
      { name: "Lunch Menu" },
      { name: "Dinner Menu" },
    ]);

    const response = await handleChat("Show me menus for restaurant 123", "test-session-id");

    expect(response).toBe("- Lunch Menu\n- Dinner Menu");
    expect(detectMessage).toHaveBeenCalledWith("Show me menus for restaurant 123");
    expect(getMenusByRestaurantId).toHaveBeenCalledWith("123");
  });

  it("should return promotions for a promotion_search intent", async () => {
    detectMessage.mockResolvedValue({
      intent: "promotion_search",
      collection: "promotions",
      filters: { restaurantId: "123" },
      metadata: {},
    });

    getPromotionsByRestaurantId.mockResolvedValue([
      { title: "Holiday Discount", discountPercent: 20 },
      { title: "Weekend Special", discountPercent: 15 },
    ]);

    const response = await handleChat("Show me promotions for restaurant 123", "test-session-id");

    expect(response).toBe("- Holiday Discount: 20% off\n- Weekend Special: 15% off");
    expect(detectMessage).toHaveBeenCalledWith("Show me promotions for restaurant 123");
    expect(getPromotionsByRestaurantId).toHaveBeenCalledWith("123");
  });

  it("should return a fallback message for unknown intents", async () => {
    detectMessage.mockResolvedValue({
      intent: "unknown",
      collection: "none",
      filters: {},
      metadata: {},
    });

    const response = await handleChat("Random message", "test-session-id");

    expect(response).toBe("Sorry, I couldn't process your request.");
    expect(detectMessage).toHaveBeenCalledWith("Random message");
  });
});