import axios from "axios";
import { addChallengeLine } from "../store";

const GET_CHALLENGES = "GET_CHALLENGES";
const CREATE_CHALLENGE = "CREATE_CHALLENGE";
const DELETE_CHALLENGE = "DELETE_CHALLENGE";
const GET_ALL_CHALLENGES = "GET_ALL_CHALLENGES";

export const getChallenges = () => {
  return async (dispatch) => {
    const token = window.localStorage.getItem("token");
    if (token) {
      const challenges = (
        await axios.get("/api/challenges/", {
          headers: {
            authorization: token,
          },
        })
      ).data;
      dispatch({ type: GET_CHALLENGES, challenges });
    }
    const allChallenges = (await axios.get("/api/challenges/")).data;
    dispatch({ type: GET_ALL_CHALLENGES, allChallenges });
  };
};

export const createChallenge = (newChallenge) => {
  return async (dispatch) => {
    const token = window.localStorage.getItem("token");
    if (token) {
      const challenge = (
        await axios.post("/api/challenges/", newChallenge, {
          headers: {
            authorization: token,
          },
        })
      ).data;
      dispatch({ type: CREATE_CHALLENGE, challenge });
      dispatch(addChallengeLine(challenge));
    }
  };
};

export const deleteChallenge = (challenge, history) => {
  return async (dispatch) => {
    const token = window.localStorage.getItem("token");
    if (token) {
      await axios.delete(`/api/challenges/${challenge.id}`, {
        headers: {
          authorization: token,
        },
      });
      dispatch({ type: DELETE_CHALLENGE, challenge });
      history.push("/challenges/");
    }
  };
};

export default function (state = [], action) {
  switch (action.type) {
    case GET_ALL_CHALLENGES:
      return action.allChallenges;
    case GET_CHALLENGES:
      return action.challenges;
    case CREATE_CHALLENGE:
      return [...state, action.challenge];
    case DELETE_CHALLENGE:
      return state.filter((challenge) => challenge.id !== action.challenge.id);
    default:
      return state;
  }
}
