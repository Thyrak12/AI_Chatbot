import restaurantService from "../services/restaurant_service.js";

export async function getRestaurantIdByName(name) {
  if (!name) return null;
  const restaurants = await restaurantService.findRestaurants(
    { name: { $regex: name, $options: "i" } },
    1
  );
  return restaurants.length ? restaurants[0]._id : null;
}
