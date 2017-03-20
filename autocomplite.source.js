'use strict';

/** Помогает пользователю правильно ввести город */
class AutocompliteCity {

	constructor() {
		this.options = {
			ajax_url: 'kladr.json',
			is_value: false,
			is_connection_error: false,
			is_frame: false,
			is_data: false,
			is_loading: false,
			is_results: false,
			is_selected: false,
			is_selecting: false,
			select_value: -1,
			reaction_time: 500,
			loading_min_time: 1000,
			max_result_size: 5,
			all_result_size: 0,
			load_start_time: 0,
			gap_between_width: 60,
			messages: {
				connection_error: 'Что-то пошло не так. Проверьте соединение с интернетом и попробуйте ещё раз',
				choice_error: 'Выберите значение из списка',
				loading: 'Загрузка',
				no_results: 'Не найдено',
				lot_results: 'Показано %limit% из %max% найденных городов. Уточните запрос, чтобы увидеть остальные'
			}
		}

		this.layout = new Object;

		this.data = new Object;
	}

	/**
	 * Инициализация
	 * @param {HTMLElement} input Поле ввода
	 * @param {function} validation Валидация форм
	 */
	init(input, validation) {
		// Проверяем, что нам передали поле ввода
		if (!(input instanceof HTMLElement && input.nodeName === 'INPUT')) {
			return;
		}

		// Проверяем, что нам передали функцию для валидации
		if (typeof validation !== 'function') {
			return;
		}

		// Запоминаем поле ввода
		this.layout.input = input;

		// Запоминаем функцию для валидации
		this.options.validation = validation;

		// Вешаем обработчик пользовательского ввода
		this.layout.input.addEventListener('focus', this._on_focus.bind(this), false);
		this.layout.input.addEventListener('keydown', this._on_keydown.bind(this), false);
		this.layout.input.addEventListener('keyup', this._on_keyup.bind(this), false);
		this.layout.input.addEventListener('input', this._on_input.bind(this), false);
		this.layout.input.addEventListener('blur', this._on_blur.bind(this), false);
	}

	/** Размещает блок на странице. Публичный, чтобы можно было "дернуть", например, при изменении размеров окна */
	checkPosition() {
		this._set_metrics();
	}

	/**
	 * Получает координаты на странице
	 * @returns {object}
	 */
	_get_metrics() {
		let input = this.layout.input.getBoundingClientRect();
		return {
			min_width: this.layout.input.offsetWidth,
			x: input.left + pageXOffset,
			y: input.top + pageYOffset + this.layout.input.offsetHeight
		};
	}

	/** Размещает автокомплит по полученным координатам */
	_set_metrics() {
		this.layout.frame.style.minWidth = this._get_metrics().min_width + this.options.gap_between_width + 'px';
		this.layout.frame.style.left = this._get_metrics().x + 'px';
		this.layout.frame.style.top = this._get_metrics().y + 'px';
	}

	/** Обрабатывает постановку фокуса */
	_on_focus() {
		this._on_input();
	}

	/** Обрабатывает пользовательский ввод */
	_on_input() {
		let query = checkValue(this.layout.input.value);

		this.options.select_value = -1;

		if (!query) {
			this.options.query = '';
			this.options.is_value = false;
			this._hide_frame();
			return;
		}

		this.options.query = query;
		this.options.is_value = true;

		// Проверяем, есть данные для автокомплита
		if (!this.options.is_data && !this.options.is_loading) {
			// Помечаем, что начали загрузку
			this.options.is_loading = true;
			// Если нет, сначала грузим данные, а потом ищем совпадения
			this._load_data(this._parse_results.bind(this));
			return;
		}

		// Если данные уже загружены
		if (this.options.is_data) {
			// Ещём совпадения
			this._parse_results();
			return;
		}

		/**
		 * Проверка введенного значения на пустоту и множественные пробелы
		 * @param {string} value
		 */
		function checkValue(value) {
			value = value.trim().replace(/\s{2,}/g, ' ');
			value = (value == ' ') ? false : value ;

			return value;
		}
	}

	/** Обрабатывает нажатие клавишы */
	_on_keydown() {
		// По Esc закрываем подсказку
		if (event.keyCode === 27) {
			this._hide_frame();
		}

		// Стрелка вверх выбирает вариант выше
		if (event.keyCode === 38) {
			event.preventDefault ? event.preventDefault() : (event.returnValue = false);

			if (this.options.select_value >= 0) {
				this.options.select_value--;
				selectOption(this.layout.results.firstChild, this.options.select_value);
			}
		}

		// Стрелка вниз выбирает вариант ниже
		if (event.keyCode === 40) {
			event.preventDefault ? event.preventDefault() : (event.returnValue = false);

			if (this.options.select_value < (this.options.max_result_size - 1) && this.options.select_value < (this.options.all_result_size - 1)) {
				this.options.select_value++;
				selectOption(this.layout.results.firstChild, this.options.select_value);
			}
		}

		// По энтеру выбираем текущий вариант
		if (event.keyCode === 13 && this.options.select_value >= 0) {
			event.preventDefault ? event.preventDefault() : (event.returnValue = false);
			this._set_value(this.layout.results.firstChild.children[this.options.select_value].innerText);
			this._emulate_tab();
		}

		// По энтеру или табуляции выбираем текущий вариант, если он один
		if ((event.keyCode === 13 || event.keyCode === 9) && this.options.all_result_size === 1) {
			this._set_value(this.layout.results.firstChild.firstChild.innerText);

			// Если нажат ентер, запрещаем действие по умолчанию
			if (event.keyCode === 13) {
				event.preventDefault ? event.preventDefault() : (event.returnValue = false);
				this._emulate_tab();
			}
		}

		/**
		 * Устанавливает класс "выделение" на выбранные стрелками вариант
		 * @param {HTMLElement} container
		 * @param {number} index
		 */
		function selectOption (container, index) {
			for (let i = 0; i < container.children.length; ++i) {
				container.children[i].className = container.children[i].className.replace('autocomplite__item--state--hover', '');
			}

			if (index >= 0) {
				container.children[index].className += ' autocomplite__item--state--hover';
			}
		}
	}

	/** Обрабатывает отжатие клавишы */
	_on_keyup() {
		// Чтобы в IE9 событие отрабатывало на удалении
		if (event.keyCode === 8 || event.keyCode === 46) {
			this._on_input();
		}
	}

	/** Обрабатывает потерю фокуса */
	_on_blur() {
		if (!this.options.is_selecting) {
			this._hide_frame();
		}

		if (!this.options.is_selecting && this.options.select_value < 0) {
			// Если результат один
			if (this.options.all_result_size === 1 && this.options.query.toLowerCase() === this.data.results[0].City.toLowerCase()) {
				this.layout.input.value = this.data.results[0].City;
				this.options.validation(false, this.layout.input);
			}

			// Если результатов нет или больше одного
			if (this.options.is_value && (this.options.all_result_size > 1 || !this.options.all_result_size)) {
				this.options.validation(true, this.layout.input, this.options.messages.choice_error);
			} else {
				this.options.validation(false, this.layout.input);
			}
		}

		this.options.select_value = -1;
	}

	/** Эмулируем смену фокуса на следующий элемент */
	_emulate_tab() {
		this.layout.input.blur();

		// Если автокомплит часть формы
		if (this.layout.input.form) {
			let elements = this.layout.input.form.elements;

			for (let i = 0; i < elements.length; ++i) {
				// Переводим фокус на следующее поле
				if(elements[i] === this.layout.input) {
					elements[i+1].focus();
					break;
				}
			}
		}
	}

	/** Вставляет блок, где будет автокомплит */
	_show_frame() {
		// Проверяем, есть ли уже блок для автоподстановки
		if (this.options.is_frame) {
			this.layout.frame.className = this.layout.frame.className.replace('autocomplite--state--hide', '');
			return;
		}

		// Создаем обёртку
		this.layout.frame = document.createElement('div');
		this.layout.frame.className = 'autocomplite';
		this.layout.frame.addEventListener('mouseenter', (function(){ this.options.is_selecting = true; }).bind(this), false);
		this.layout.frame.addEventListener('mouseleave', (function(){ this.options.is_selecting = false; }).bind(this), false);

		// Создаем в обёртке контейнер для результатов
		this.layout.results = document.createElement('div');
		this.layout.results.className = 'autocomplite__results';
		this.layout.frame.appendChild(this.layout.results);

		// Создаем в обёртке контейнер для уведомлений
		this.layout.notifications = document.createElement('div');
		this.layout.notifications.className = 'autocomplite__notifications';
		this.layout.frame.appendChild(this.layout.notifications);

		// Размещаем обёртку
		this.checkPosition();

		// Добавляем обёртку на страницу
		document.body.appendChild(this.layout.frame);

		this.options.is_frame = true;
	}

	/** Скрывает блок с автокомплитом */
	_hide_frame() {
		// Проверяем, есть ли уже блок для автоподстановки
		if (this.options.is_frame) {
			this.layout.frame.className += ' autocomplite--state--hide';
			return;
		}
	}

	/** Очищает блок с результатами */
	_clear_frame_results() {
		this.layout.results.innerHTML = '';
	}

	/** Очищает блок с уведомлениями */
	_clear_frame_notifications() {
		this.layout.notifications.innerHTML = '';
	}

	/**
	 * Вставляет HTML с данными
	 * @param {HTMLElement} parent
	 * @param {string} tagname
	 * @param {string} classnames
	 * @param {string} content
	 */
	_insert_layout(parent, tagname, classnames, content) {
		let element;

		element = document.createElement(tagname);

		classnames.split(' ').forEach(function(classname){
			element.className += ' ' + classname;
		});

		element.innerText = content;

		parent.innerHTML = '';
		parent.appendChild(element);
	}

	/** Уведомляет о том, что данные загружаются */
	_is_loading() {
		this._show_frame();
		this._insert_layout(this.layout.notifications, 'div', 'autocomplite__notification autocomplite__notification--state--loading', this.options.messages.loading);
	}

	/** Уведомляет об ошибке соединения */
	_is_connection_error() {
		this._show_frame();
		this._insert_layout(this.layout.notifications, 'div', 'autocomplite__notification autocomplite__notification--state--connection-error', this.options.messages.connection_error);
	}

	/** Уведомляет о том, что ничего не найдено */
	_is_empty_result() {
		this._show_frame();
		this._insert_layout(this.layout.notifications, 'div', 'autocomplite__notification autocomplite__notification--state--no-results', this.options.messages.no_results);
	}

	/** Уведомляет о том, что нужно уточнить запрос */
	_is_more_result() {
		this._show_frame();

		let message = this.options.messages.lot_results.replace(/%limit%/g, this.options.max_result_size).replace(/%max%/g, this.options.all_result_size);

		this._insert_layout(this.layout.notifications, 'div', 'autocomplite__notification autocomplite__notification--state--lot-results', message);
	}

	/** Выводит результаты */
	_show_result() {
		this._show_frame();

		let items = document.createElement('ul');
		items.className = 'autocomplite__items';

		for (let result in this.data.results) {
			let item = document.createElement('li')
			item.className = 'autocomplite__item';
			item.innerText = this.data.results[result].City;
			item.addEventListener('click', this._set_value.bind(this, item.innerText), false);
			items.appendChild(item);
		}

		this.layout.results.appendChild(items);
	}

	/**
	 * Устанавливает выбранное значение в поле ввода
	 * @param {string} value
	 */
	_set_value(value) {
		this.layout.input.query = this.layout.input.value = value;
		this.options.validation(false, this.layout.input);
		this._hide_frame();
	}

	/** Ищет совпадения */
	_parse_results() {
		this._show_frame();
		this._clear_frame_results();
		this._clear_frame_notifications();

		let found_result_size = 0;

		this.data.results = {};
		this.options.is_results = false;
		this.options.all_result_size = 0;

		for (let item in this.data.base) {
			let result = this.data.base[item];

			// Проверяем, есть ли совпадения в этом шаге
			if (сheckEntry(this.options.query, result.City)) {

				if (found_result_size < this.options.max_result_size) {
					this.data.results[found_result_size] = result;
					found_result_size++;
				}

				if (found_result_size == this.options.max_result_size && !this.options.is_results) {
					this.options.is_results = true;
					this._show_result();
				}

				this.options.all_result_size++;
			}

			/**
			 * Ищет совпадения с базой
			 * @param {string} query
			 * @param {string} source
			 */
			function сheckEntry(query, source) {
				query = query.toLowerCase();
				source = source.toLowerCase();

				let char_index = source.indexOf(query);

				// Проверяем, если ли вообще вхождения
				if (!~char_index) {
					return false;
				}

				// Проверяем, чтобы вхождение было не в середине слова
				if (char_index && ~source.charAt(char_index - 1).search(/[A-Za-zА-Яа-яЁё-]/)) {
					return false;
				}

				return true;
			}
		}

		if (!this.options.is_results) {
			this._show_result();
		}

		if (this.options.all_result_size > this.options.max_result_size) {
			this._is_more_result();
		}

		if (!this.options.all_result_size) {
			this._is_empty_result();
		}
	}

	/**
	 * Запрашиваем данные с сервера
	 * @param {function} callback
	 */
	_load_data(callback) {
		let xhr = new XMLHttpRequest();

		// Помечаем, что ошибки соединения пока нет
		this.options.is_connection_error = false;

		xhr.open('GET', this.options.ajax_url, true);
		xhr.send();
		xhr.onreadystatechange = this._xhr.bind(this, xhr, callback);

		setTimeout((function(){
			if(this.options.is_loading && !this.options.is_connection_error) {
				this._is_loading();
			}
		}).bind(this), this.options.reaction_time);
	}

	/**
	 * Обрабатываем запрос на сервер
	 * @param {object} request
	 * @param {function} callback
	 */
	_xhr(request, callback) {
		// Ждём завершения запроса
		if (request.readyState != 4) {
			return;
		}

		// Если сервер ответил ошибкой, обрабатываем её
		if (request.status != 200) {
			this.options.is_connection_error = true;
			this.options.is_loading = false;
			this._is_connection_error();
			return;
		}

		// Проверяем, что сервер вернул JSON
		if (!JSON.parse(request.responseText)) {
			this.options.is_connection_error = true;
			this.options.is_loading = false;
			this._is_connection_error();
			return;
		}

		// Если сервер отдал верные данные, запоминаем их
		this.data.base = JSON.parse(request.responseText);

		// Помечаем, что данные получены
		this.options.is_data = true;

		// Помечаем, что закончили загрузку
		this.options.is_loading = false;

		// Обратный вызов, если пока грузили пользователь не стёр введенное
		if (callback && this.options.is_value) {
			callback();
		}
	}
}
