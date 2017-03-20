'use strict';

/** Валидация */
function Validation() {

	let self = this;

	/**
	 * Инициализация
	 * @param {object} controls Коллекция контролов
	 */
	this.init = function (controls) {
		for (var i = 0; i < controls.length; ++i) {
			controls[i].addEventListener('input', this.startCorrection.bind(this, controls[i]), false);
		}
	}

	/**
	 * Пользователь начал исправление
	 * @param {HTMLElement} control Поле ввода, где происходит исправление
	 */
	this.startCorrection = function (control) {
		control.className = control.className.replace('input--state--error', '');
	};

	/**
	 * Обработка ошибки
	 * @param {boolean} error Есть или нет ошибки
	 * @param {HTMLElement} control Поле ввода, на котором вызвали ошибку
	 * @param {String} message Текст ошибки
	 */
	this.error = function (error, control, message) {
		if (error) {
			self.showError(control, message);
		}

		if (!error) {
			self.hideError(control);
		}
	}

	/**
	 * Выводит сообщение об ошибке
	 * @param {HTMLElement} control Поле ввода, на котором вызвали ошибку
	 * @param {String} message Текст ошибки
	 */
	this.showError = function (control, message) {
		if (!control.parentNode.querySelector('.field__error')) {
			let error_container = document.createElement('div');
			error_container.className = 'field__error';
			error_container.innerText = message;
			control.parentNode.appendChild(error_container);
		}

		control.className += ' input--state--error';
	}

	/**
	 * Скрывает сообщение об ошибке
	 * @param {HTMLElement} control Поле ввода, на котором вызвали ошибку
	 */
	this.hideError = function (control) {
		let container = control.parentNode.querySelector('.field__error');
		if (container) {
			control.parentNode.removeChild(container);
		}
		control.className = control.className.replace('input--state--error', '');
	}
}
