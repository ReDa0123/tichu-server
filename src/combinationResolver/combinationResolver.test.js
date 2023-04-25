import {
  getCombinationType,
  isCombinationPair,
  isCombinationTriple,
  isCombinationFullHouse,
  isCombinationBomb4,
  isCombinationStraight,
  isBiggerCombination,
  isValidCombination,
} from "./combinationResolver.js";

describe("CombinationResolver", () => {
  describe("getCombinationType", () => {
    it("should return SINGLE for single card", () => {
      const playedCards = [{ number: "2", color: "R" }];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("SINGLE");
    });

    it("should return PAIR for pair of 2 cards", () => {
      const playedCards = [
        { number: "2", color: "R" },
        { number: "2", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("PAIR");
    });

    it("should return PAIR2 for pair of 4 cards", () => {
      const playedCards = [
        { number: "2", color: "R" },
        { number: "2", color: "R" },
        { number: "3", color: "R" },
        { number: "3", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("PAIR2");
    });

    it("should return TRIPLE for triple of 3 cards", () => {
      const playedCards = [
        { number: "2", color: "R" },
        { number: "2", color: "R" },
        { number: "2", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("TRIPLE");
    });

    it("should return FULL_HOUSE for full house", () => {
      const playedCards = [
        { number: "10", color: "R" },
        { number: "10", color: "R" },
        { number: "10", color: "R" },
        { number: "5", color: "R" },
        { number: "5", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("FULL_HOUSE");
    });

    it("should return BOMB4 for bomb of 4 cards", () => {
      const playedCards = [
        { number: "A", color: "R" },
        { number: "A", color: "B" },
        { number: "A", color: "U" },
        { number: "A", color: "G" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("BOMB4");
    });

    it("should return STRAIGHT5 for straight of 5 cards with different colors", () => {
      const playedCards = [
        { number: "2", color: "R" },
        { number: "3", color: "R" },
        { number: "4", color: "B" },
        { number: "5", color: "R" },
        { number: "6", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("STRAIGHT5");
    });

    it("should return STRAIGHT8 for straight of 8 cards with different colors", () => {
      const playedCards = [
        { number: "2", color: "R" },
        { number: "3", color: "R" },
        { number: "4", color: "B" },
        { number: "5", color: "R" },
        { number: "6", color: "R" },
        { number: "7", color: "B" },
        { number: "8", color: "R" },
        { number: "9", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("STRAIGHT8");
    });

    it("should return BOMB_STRAIGHT5 for straight of 5 cards with same colors", () => {
      const playedCards = [
        { number: "A", color: "R" },
        { number: "K", color: "R" },
        { number: "J", color: "R" },
        { number: "Q", color: "R" },
        { number: "10", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe("BOMB_STRAIGHT5");
    });

    it("should return null for empty array", () => {
      const playedCards = [];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe(null);
    });

    it("should return null for non valid combination", () => {
      const playedCards = [
        { number: "2", color: "R" },
        { number: "3", color: "R" },
      ];
      const combinationType = getCombinationType(playedCards);
      expect(combinationType).toBe(null);
    });
  });

  describe("isCombinationPair", () => {
    it("should return true if the cards are a pair of 2 cards", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
      ];
      expect(isCombinationPair(cards)).toBe(true);
    });

    it("should return true if the cards are a pair of 4 or more cards connected", () => {
      const cards = [
        { number: "J", color: "R" },
        { number: "J", color: "B" },
        { number: "Q", color: "G" },
        { number: "Q", color: "U" },
        { number: "K", color: "R" },
        { number: "K", color: "B" },
        { number: "A", color: "G" },
        { number: "A", color: "U" },
      ];
      expect(isCombinationPair(cards)).toBe(true);
    });

    it("should return false if the cards are not a pair", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "R" },
        { number: "2", color: "R" },
        { number: "2", color: "R" },
        { number: "3", color: "B" },
        { number: "3", color: "B" },
      ];
      expect(isCombinationPair(cards)).toBe(false);
    });

    it("should return false if the cards are not connected pair", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "4", color: "G" },
        { number: "4", color: "U" },
      ];
      expect(isCombinationPair(cards)).toBe(false);
    });
  });

  describe("isCombinationTriple", () => {
    it("should return true if the cards are a triple of 3 cards", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
      ];
      expect(isCombinationTriple(cards)).toBe(true);
    });

    it("should return false if the length of played cards is not 3", () => {
      const cards1 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
      ];
      const cards2 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "2", color: "U" },
      ];
      expect(isCombinationTriple(cards1)).toBe(false);
      expect(isCombinationTriple(cards2)).toBe(false);
    });

    it("should return false if 3 cards are not a triple", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "3", color: "G" },
      ];
      expect(isCombinationTriple(cards)).toBe(false);
    });
  });

  describe("isCombinationFullHouse", () => {
    it("should return true if the cards are a full house", () => {
      const cards1 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "3", color: "R" },
        { number: "3", color: "B" },
      ];

      const cards = [
        { number: "J", color: "R" },
        { number: "J", color: "B" },
        { number: "A", color: "G" },
        { number: "A", color: "R" },
        { number: "A", color: "B" },
      ];
      expect(isCombinationFullHouse(cards1)).toBe(true);
      expect(isCombinationFullHouse(cards)).toBe(true);
    });

    it("should return false if the length of played cards is not 5", () => {
      const cards1 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "3", color: "R" },
      ];
      const cards2 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "3", color: "R" },
        { number: "3", color: "B" },
        { number: "3", color: "G" },
      ];
      expect(isCombinationFullHouse(cards1)).toBe(false);
      expect(isCombinationFullHouse(cards2)).toBe(false);
    });

    it("should return false if the cards are not a full house", () => {
      const cards1 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "4", color: "G" },
        { number: "3", color: "R" },
        { number: "3", color: "B" },
      ];
      const cards2 = [
        { number: "K", color: "R" },
        { number: "K", color: "B" },
        { number: "K", color: "G" },
        { number: "K", color: "R" },
        { number: "A", color: "B" },
      ];
      expect(isCombinationFullHouse(cards1)).toBe(false);
      expect(isCombinationFullHouse(cards2)).toBe(false);
    });
  });

  describe("isCombinationBomb4", () => {
    it("should return true if the cards are a bomb of 4 cards", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "2", color: "U" },
      ];
      expect(isCombinationBomb4(cards)).toBe(true);
    });

    it("should return false if the length of played cards is not 4", () => {
      const cards1 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
      ];
      const cards2 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "5", color: "U" },
        { number: "5", color: "R" },
      ];
      expect(isCombinationBomb4(cards1)).toBe(false);
      expect(isCombinationBomb4(cards2)).toBe(false);
    });

    it("should return false if the cards are not a bomb of 4 cards", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "3", color: "G" },
        { number: "3", color: "U" },
      ];
      expect(isCombinationBomb4(cards)).toBe(false);
    });
  });

  describe("isCombinationStraight", () => {
    it("should return true if the cards are a straight", () => {
      const cards1 = [
        { number: "9", color: "R" },
        { number: "10", color: "B" },
        { number: "J", color: "G" },
        { number: "Q", color: "U" },
        { number: "K", color: "R" },
      ];
      const cards2 = [
        { number: "2", color: "R" },
        { number: "3", color: "B" },
        { number: "4", color: "G" },
        { number: "5", color: "U" },
        { number: "6", color: "R" },
        { number: "7", color: "R" },
        { number: "8", color: "B" },
        { number: "9", color: "G" },
        { number: "10", color: "U" },
      ];
      expect(isCombinationStraight(cards1)).toBe(true);
      expect(isCombinationStraight(cards2)).toBe(true);
    });

    it("should return false if the length of played straight is more than 5", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "3", color: "B" },
        { number: "4", color: "G" },
        { number: "5", color: "U" },
      ];
      expect(isCombinationStraight(cards)).toBe(false);
    });

    it("should return false if the cards are not a straight", () => {
      const cards = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "4", color: "G" },
        { number: "5", color: "U" },
        { number: "6", color: "R" },
      ];
      expect(isCombinationStraight(cards)).toBe(false);
    });
  });

  describe("isBiggerCombination", () => {
    it("should return true if the first single combination is bigger than the second", () => {
      const combination1 = [{ number: "3", color: "R" }];
      const combination2 = [{ number: "2", color: "R" }];
      expect(isBiggerCombination(combination1, combination2)).toBe(true);
    });

    it("should return true if the first pair combination is bigger than the second", () => {
      const combination1 = [
        { number: "3", color: "R" },
        { number: "3", color: "B" },
      ];
      const combination2 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
      ];

      const combination3 = [
        { number: "K", color: "R" },
        { number: "K", color: "B" },
        { number: "A", color: "R" },
        { number: "A", color: "B" },
      ];
      const combination4 = [
        { number: "10", color: "R" },
        { number: "10", color: "B" },
        { number: "J", color: "R" },
        { number: "J", color: "B" },
      ];
      expect(isBiggerCombination(combination1, combination2)).toBe(true);
      expect(isBiggerCombination(combination3, combination4)).toBe(true);
    });

    it("should return true if the first triple combination is bigger than the second", () => {
      const combination1 = [
        { number: "Q", color: "R" },
        { number: "Q", color: "B" },
        { number: "Q", color: "G" },
      ];
      const combination2 = [
        { number: "8", color: "R" },
        { number: "8", color: "B" },
        { number: "8", color: "G" },
      ];
      expect(isBiggerCombination(combination1, combination2)).toBe(true);
    });

    it("should return true if the first full house combination is bigger than the second", () => {
      const combination1 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "K", color: "R" },
        { number: "K", color: "B" },
      ];
      const combination2 = [
        { number: "8", color: "R" },
        { number: "8", color: "B" },
        { number: "8", color: "G" },
        { number: "7", color: "R" },
        { number: "7", color: "B" },
      ];
      expect(
        isBiggerCombination(combination1, combination2, "FULL_HOUSE")
      ).toBe(true);
    });

    it("should return true if the first bomb4 combination is bigger than the second", () => {
      const combination1 = [
        { number: "9", color: "R" },
        { number: "9", color: "B" },
        { number: "9", color: "G" },
        { number: "9", color: "U" },
      ];
      const combination2 = [
        { number: "5", color: "R" },
        { number: "5", color: "B" },
        { number: "5", color: "G" },
        { number: "5", color: "U" },
      ];
      expect(isBiggerCombination(combination1, combination2)).toBe(true);
    });

    it("should return true if the first straight combination is bigger than the second", () => {
      const combination1 = [
        { number: "4", color: "R" },
        { number: "6", color: "B" },
        { number: "5", color: "G" },
        { number: "8", color: "U" },
        { number: "7", color: "R" },
      ];
      const combination2 = [
        { number: "2", color: "R" },
        { number: "5", color: "B" },
        { number: "3", color: "G" },
        { number: "4", color: "U" },
        { number: "6", color: "R" },
      ];
      expect(isBiggerCombination(combination1, combination2)).toBe(true);
    });

    it("should return false if the first single combination is not bigger than the second", () => {
      const combination1 = [{ number: "8", color: "R" }];
      const combination2 = [{ number: "A", color: "R" }];
      expect(isBiggerCombination(combination1, combination2)).toBe(false);
    });

    it("should return false if the first full house combination is not bigger than the second", () => {
      const combination1 = [
        { number: "K", color: "R" },
        { number: "K", color: "B" },
        { number: "K", color: "G" },
        { number: "4", color: "R" },
        { number: "4", color: "B" },
      ];
      const combination2 = [
        { number: "8", color: "R" },
        { number: "8", color: "B" },
        { number: "8", color: "G" },
        { number: "7", color: "R" },
        { number: "7", color: "B" },
      ];

      const combination3 = [
        { number: "2", color: "R" },
        { number: "2", color: "B" },
        { number: "2", color: "G" },
        { number: "4", color: "R" },
        { number: "4", color: "B" },
      ];
      const combination4 = [
        { number: "8", color: "R" },
        { number: "8", color: "B" },
        { number: "8", color: "G" },
        { number: "7", color: "R" },
        { number: "7", color: "B" },
      ];

      const combination5 = [
        { number: "8", color: "R" },
        { number: "8", color: "B" },
        { number: "8", color: "G" },
        { number: "7", color: "R" },
        { number: "7", color: "B" },
      ];
      const combination6 = [
        { number: "8", color: "R" },
        { number: "8", color: "B" },
        { number: "8", color: "G" },
        { number: "7", color: "R" },
        { number: "7", color: "B" },
      ];
      expect(
        isBiggerCombination(combination1, combination2, "FULL_HOUSE")
      ).toBe(false);
      expect(
        isBiggerCombination(combination3, combination4, "FULL_HOUSE")
      ).toBe(false);
      expect(
        isBiggerCombination(combination5, combination6, "FULL_HOUSE")
      ).toBe(false);
    });
  });

  describe("isValidCombination", () => {
    it("should return true if you have initiative", () => {
      expect(
        isValidCombination([{ number: "8", color: "R" }], "SINGLE", {})
      ).toBe(true);
    });

    it("should return true if you play a bomb on a non bomb combination", () => {
      expect(
        isValidCombination([], "BOMB4", {
          type: "SINGLE",
        })
      ).toBe(true);
    });

    it("should return true if you play a straight bomb on a bomb4 combination", () => {
      expect(
        isValidCombination([], "BOMB_STRAIGHT5", {
          type: "BOMB4",
        })
      ).toBe(true);
    });

    it("should return true if you play a longer straight bomb on a straight bomb combination", () => {
      expect(
        isValidCombination([1, 2, 3, 4, 5, 6], "BOMB_STRAIGHT6", {
          type: "BOMB_STRAIGHT5",
          cards: [1, 2, 3, 4, 5],
        })
      ).toBe(true);
    });

    it("should return false if you play a different non-bomb combination", () => {
      expect(isValidCombination([], "SINGLE", { type: "TRIPLE" })).toBe(false);
    });

    it("should return true if you play the same combination and it is bigger", () => {
      expect(
        isValidCombination([{ number: "8", color: "R" }], "SINGLE", {
          type: "SINGLE",
          cards: [{ number: "7", color: "R" }],
        })
      ).toBe(true);
    });

    it("should return false if you play the same combination and it is not bigger", () => {
      expect(
        isValidCombination(
          [
            { number: "8", color: "R" },
            { number: "8", color: "R" },
            { number: "8", color: "R" },
            { number: "J", color: "R" },
            { number: "J", color: "R" },
          ],
          "FULL_HOUSE",
          {
            type: "FULL_HOUSE",
            cards: [
              { number: "2", color: "R" },
              { number: "2", color: "R" },
              { number: "2", color: "R" },
              { number: "K", color: "R" },
              { number: "K", color: "R" },
            ],
          }
        )
      ).toBe(false);
    });
  });
});
