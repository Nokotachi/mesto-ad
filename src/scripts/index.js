/*
  Файл index.js является точкой входа в наше приложение
  и только он должен содержать логику инициализации нашего приложения
  используя при этом импорты из других файлов

  Из index.js не допускается что то экспортировать
*/

import { createCardElement, deleteCard, updateCardLikes } from "./components/card.js";
import { openModalWindow, closeModalWindow, setCloseModalWindowEventListeners } from "./components/modal.js";
import { enableValidation, clearValidation } from "./components/validation.js";
import {
  getUserInfo,
  getCardList,
  setUserInfo,
  setUserAvatar,
  addCard,
  deleteCardFromServer,
  changeLikeCardStatus,
} from "./components/api.js";

const validationSettings = {
  formSelector: ".popup__form",
  inputSelector: ".popup__input",
  submitButtonSelector: ".popup__button",
  inactiveButtonClass: "popup__button_disabled",
  inputErrorClass: "popup__input_type_error",
  errorClass: "popup__error_visible",
};

// DOM узлы
const placesWrap = document.querySelector(".places__list");
const profileFormModalWindow = document.querySelector(".popup_type_edit");
const profileForm = profileFormModalWindow.querySelector(".popup__form");
const profileSubmitButton = profileForm.querySelector(".popup__button");
const profileTitleInput = profileForm.querySelector(".popup__input_type_name");
const profileDescriptionInput = profileForm.querySelector(".popup__input_type_description");

const cardFormModalWindow = document.querySelector(".popup_type_new-card");
const cardForm = cardFormModalWindow.querySelector(".popup__form");
const cardSubmitButton = cardForm.querySelector(".popup__button");
const cardNameInput = cardForm.querySelector(".popup__input_type_card-name");
const cardLinkInput = cardForm.querySelector(".popup__input_type_url");

const imageModalWindow = document.querySelector(".popup_type_image");
const imageElement = imageModalWindow.querySelector(".popup__image");
const imageCaption = imageModalWindow.querySelector(".popup__caption");

const logo = document.querySelector(".header__logo");
const openProfileFormButton = document.querySelector(".profile__edit-button");
const openCardFormButton = document.querySelector(".profile__add-button");

const profileTitle = document.querySelector(".profile__title");
const profileDescription = document.querySelector(".profile__description");
const profileAvatar = document.querySelector(".profile__image");

const avatarFormModalWindow = document.querySelector(".popup_type_edit-avatar");
const avatarForm = avatarFormModalWindow.querySelector(".popup__form");
const avatarSubmitButton = avatarForm.querySelector(".popup__button");
const avatarInput = avatarForm.querySelector(".popup__input");

const removeCardModalWindow = document.querySelector(".popup_type_remove-card");
const removeCardForm = removeCardModalWindow.querySelector(".popup__form");
const removeCardSubmitButton = removeCardForm.querySelector(".popup__button");

const statsModalWindow = document.querySelector(".popup_type_info");
const statsModalTitle = statsModalWindow.querySelector(".popup__title");
const statsModalInfoList = statsModalWindow.querySelector(".popup__info");
const statsModalText = statsModalWindow.querySelector(".popup__text");
const statsModalCardList = statsModalWindow.querySelector(".popup__list");

const infoDefinitionTemplate = document
  .getElementById("popup-info-definition-template")
  .content.querySelector(".popup__info-item");
const infoPreviewTemplate = document
  .getElementById("popup-info-user-preview-template")
  .content.querySelector(".popup__list-item");

const allPopups = document.querySelectorAll(".popup");

let currentUserId = "";
let cardToDelete = null;

const renderLoading = (buttonElement, isLoading, loadingText, defaultText) => {
  buttonElement.textContent = isLoading ? loadingText : defaultText;
};

const renderUserInfo = ({ name, about, avatar }) => {
  profileTitle.textContent = name;
  profileDescription.textContent = about;
  profileAvatar.style.backgroundImage = `url("${avatar}")`;
};

const createInfoString = (term, description) => {
  const infoItem = infoDefinitionTemplate.cloneNode(true);
  infoItem.querySelector(".popup__info-term").textContent = term;
  infoItem.querySelector(".popup__info-description").textContent = description;
  return infoItem;
};

const createCardPreview = (card) => {
  const cardPreview = infoPreviewTemplate.cloneNode(true);
  cardPreview.textContent = card.name;
  return cardPreview;
};

const handlePreviewPicture = ({ name, link }) => {
  imageElement.src = link;
  imageElement.alt = name;
  imageCaption.textContent = name;
  openModalWindow(imageModalWindow);
};

const handleLikeCard = (cardElement, cardId, isLiked) => {
  changeLikeCardStatus(cardId, isLiked)
    .then((cardData) => {
      updateCardLikes(cardElement, cardData.likes, currentUserId);
    })
    .catch((err) => {
      console.log(err);
    });
};

const handleDeleteCard = (cardElement, cardId) => {
  cardToDelete = { cardElement, cardId };
  openModalWindow(removeCardModalWindow);
};

const getLikesByUser = (cards) => {
  const likesByUser = new Map();
  cards.forEach((card) => {
    card.likes.forEach((user) => {
      const userStats = likesByUser.get(user._id) || { name: user.name, likesCount: 0 };
      userStats.likesCount += 1;
      likesByUser.set(user._id, userStats);
    });
  });
  return likesByUser;
};

const getLikesChampion = (cards) => {
  return Array.from(getLikesByUser(cards).values()).reduce(
    (champion, userStats) => (userStats.likesCount > champion.likesCount ? userStats : champion),
    { name: "—", likesCount: 0 }
  );
};

const getPopularCards = (cards, cardsCount) => {
  return [...cards].sort((a, b) => b.likes.length - a.likes.length).slice(0, cardsCount);
};

const handleLogoClick = () => {
  /* Для вывода корректной статистики необходимо получить актуальные данные с сервера. */
  getCardList()
    .then((cards) => {
      const usersCount = new Set(cards.map((card) => card.owner._id)).size;
      const likesCount = cards.reduce((sum, card) => sum + card.likes.length, 0);
      const likesChampion = getLikesChampion(cards);

      statsModalTitle.textContent = "Статистика карточек";
      statsModalInfoList.replaceChildren(
        createInfoString("Всего пользователей:", usersCount),
        createInfoString("Всего лайков:", likesCount),
        createInfoString("Максимально лайков от одного:", likesChampion.likesCount),
        createInfoString("Чемпион лайков:", likesChampion.name)
      );

      statsModalText.textContent = "Популярные карточки:";
      statsModalCardList.replaceChildren(...getPopularCards(cards, 3).map(createCardPreview));

      openModalWindow(statsModalWindow);
    })
    .catch((err) => {
      console.log(err);
    });
};

const cardHandlers = {
  onPreviewPicture: handlePreviewPicture,
  onLikeIcon: handleLikeCard,
  onDeleteCard: handleDeleteCard,
};

const handleProfileFormSubmit = (evt) => {
  evt.preventDefault();
  renderLoading(profileSubmitButton, true, "Сохранение...", "Сохранить");
  setUserInfo({
    name: profileTitleInput.value,
    about: profileDescriptionInput.value,
  })
    .then((userData) => {
      renderUserInfo(userData);
      closeModalWindow(profileFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(profileSubmitButton, false, "Сохранение...", "Сохранить");
    });
};

const handleAvatarFormSubmit = (evt) => {
  evt.preventDefault();
  renderLoading(avatarSubmitButton, true, "Сохранение...", "Сохранить");
  setUserAvatar({ avatar: avatarInput.value })
    .then((userData) => {
      renderUserInfo(userData);
      avatarForm.reset();
      closeModalWindow(avatarFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(avatarSubmitButton, false, "Сохранение...", "Сохранить");
    });
};

const handleCardFormSubmit = (evt) => {
  evt.preventDefault();
  renderLoading(cardSubmitButton, true, "Создание...", "Создать");
  addCard({
    name: cardNameInput.value,
    link: cardLinkInput.value,
  })
    .then((cardData) => {
      placesWrap.prepend(createCardElement(cardData, currentUserId, cardHandlers));
      cardForm.reset();
      closeModalWindow(cardFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(cardSubmitButton, false, "Создание...", "Создать");
    });
};

const handleRemoveCardFormSubmit = (evt) => {
  evt.preventDefault();
  renderLoading(removeCardSubmitButton, true, "Удаление...", "Да");
  deleteCardFromServer(cardToDelete.cardId)
    .then(() => {
      deleteCard(cardToDelete.cardElement);
      closeModalWindow(removeCardModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      renderLoading(removeCardSubmitButton, false, "Удаление...", "Да");
    });
};

// EventListeners
profileForm.addEventListener("submit", handleProfileFormSubmit);
cardForm.addEventListener("submit", handleCardFormSubmit);
avatarForm.addEventListener("submit", handleAvatarFormSubmit);
removeCardForm.addEventListener("submit", handleRemoveCardFormSubmit);
logo.addEventListener("click", handleLogoClick);

openProfileFormButton.addEventListener("click", () => {
  profileTitleInput.value = profileTitle.textContent;
  profileDescriptionInput.value = profileDescription.textContent;
  clearValidation(profileForm, validationSettings);
  openModalWindow(profileFormModalWindow);
});

profileAvatar.addEventListener("click", () => {
  avatarForm.reset();
  clearValidation(avatarForm, validationSettings);
  openModalWindow(avatarFormModalWindow);
});

openCardFormButton.addEventListener("click", () => {
  cardForm.reset();
  clearValidation(cardForm, validationSettings);
  openModalWindow(cardFormModalWindow);
});

//настраиваем обработчики закрытия попапов
allPopups.forEach((popup) => {
  setCloseModalWindowEventListeners(popup);
});

enableValidation(validationSettings);

Promise.all([getCardList(), getUserInfo()])
  .then(([cards, userData]) => {
    currentUserId = userData._id;
    renderUserInfo(userData);
    cards.forEach((cardData) => {
      placesWrap.append(createCardElement(cardData, currentUserId, cardHandlers));
    });
  })
  .catch((err) => {
    console.log(err);
  });
