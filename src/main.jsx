// ==UserScript==
// @name         /* @echo name */
// @namespace    k00lagin.enhanced-sier
// @updateURL    https://raw.githubusercontent.com/k00lagin/enhanced-sier/master/main.js
// @version      /* @echo version */
// @description  /* @echo description */
// @author       /* @echo author */
// @match        http://172.153.153.48/*
// @grant        GM_addStyle
// ==/UserScript==


(function () {
	'use strict';

	let ES = {
		aliases: {
			719747: 'прописка',
			723392: 'права',
			727489: 'снилс',
		},
		persons: []
	};

	const React = {
		events: {
			onKeyUp: 'keyup',
			onClick: 'click'
		},
		createElement: function (tag, attrs, ...children) {
			var element = document.createElement(tag);

			for (let name in attrs) {
				if (name && attrs.hasOwnProperty(name)) {
					let value = attrs[name];
					if (name === 'className') {
						element.className = value.toString();
					}
					else if (this.events[name]) {
						element.addEventListener(this.events[name], value);
					}
					else if (value === true) {
						element.setAttribute(name, name);
					} else if (value !== false && value != null) {
						element.setAttribute(name, value.toString());
					}
				}
			}
			children.forEach(child => {
				element.appendChild(
					child.nodeType == null ?
						document.createTextNode(child.toString()) : child);
			});
			return element;
		}
	};

	function checkLoadState() {
		if (!document.querySelector('.navigation.navigation-main')) {
			return;
		}
		else {
			init();
		}
	}

	async function getServiceList() {
		window.serviceList = [];
		let response = await fetch('http://172.153.153.48/api/v1/search/subservices', {
			method: 'POST',
			headers: {
				Accept: 'application/hal+json',
				Authorization: 'Bearer ' + localStorage.accessToken,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				'search': {
					'search': [{
						'field': 'units.id',
						'operator': 'eq',
						'value': '58bd51815744bf06e001b57b'
					}]
				},
				'size': 200,
				'sort': 'serviceCode,DESC',
				'prj': 'servicesList'
			})
		});
		if (response.ok) {
			let subservices = await response.json();
			subservices = subservices.content
			subservices.forEach(subservice => {
				let service = {
					id: subservice._id,
					sid: subservice.serviceId.split('_')[3],
					name: subservice.serviceName
				}
				window.serviceList.push(service);
			});

		} else {
			console.warn('Ошибка HTTP: ' + response.status);
		}
	}

	function getFilteredList(string) {
		let words = string.split(' ');
		let filteredList = serviceList.filter(service => {
			return words.every(word => {
				if (ES.aliases[service.sid] && ES.aliases[service.sid].indexOf(word) !== -1) {
					return true;
				}
				if (service.sid.indexOf(word) !== -1) {
					return true;
				}
				if (service.name.indexOf(word) !== -1) {
					return true;
				}
			});
		});
		return filteredList;
	}

	function plantServiceSearchTrigger() {
		let serviceSearchTrigger = (
			<button className='service-search-trigger icon-magic-wand'
				onClick={handleSearchTriggerClick}></button>
		)
		let navigationContainer = document.querySelector('.navigation.navigation-main');
		navigationContainer.appendChild(serviceSearchTrigger);
	}

	function checkSearchTrigger() {
		if (!document.querySelector('.navigation.navigation-main .service-search-trigger')) {
			plantServiceSearchTrigger();
		}
	}

	function init() {
		getServiceList();
		plantServiceSearchTrigger();
		clearInterval(initInterval);
		ES.fixSearchTriggerInterval = setInterval(checkSearchTrigger, 500);
		ES.checkPersonsSearchInterval = setInterval(checkPersonsList, 1000);
		createServiceSearchDialog()
		document.body.addEventListener('keyup', handleESKeyup);
		GM_addStyle(`/* @echo style */`);
	}

	function createServiceSearchDialog() {
		let dialog = (
			<dialog className='service-search-dialog hidden'>
				<header className='dialog-header'>
					<span className='dialog-title'>Начало нового дела</span>
					<button className='dialog__close-trigger icon-cross' onClick={closeServiceSearchDialog}></button>
				</header>
				<input className='service-search-input form-control' type='text'
					onKeyUp={handleSearchKeyup} placeholder='Часть названия услуги, её код, или псевдоним...'></input>
				<ul className='service-list-node'></ul>
			</dialog>
		)
		document.body.appendChild(dialog);
	}

	function updateServiceList() {
		let filteredList = [];
		let serviceListNode = document.querySelector('.service-list-node');
		if (document.querySelector('.service-search-input').value === '') {
			filteredList = serviceList;
		}
		else {
			filteredList = getFilteredList(document.querySelector('.service-search-input').value);
		}
		serviceListNode.innerHTML = '';
		filteredList.forEach(service => {
			let listItem = (
				<li className='service-item'>
					<span className='service-code'>{service.sid} </span>
					<a className='service-link' tabindex='0'
						href={'http://172.153.153.48/ais/appeals/create/' + service.id}>
						{service.name}
					</a>
				</li>
			);
			serviceListNode.appendChild(listItem);
		})
	}

	function handleSearchTriggerClick() {
		if (document.querySelector('.service-search-dialog.hidden')) {
			openServiceSearchDialog();
		}
		else {
			closeServiceSearchDialog();
		}
	}

	function openServiceSearchDialog() {
		document.querySelector('.service-search-input').value = '';
		updateServiceList();
		document.querySelector('.service-search-dialog').classList.remove('hidden');
		document.querySelector('.service-search-input').focus();
	}
	function closeServiceSearchDialog() {
		document.querySelector('.service-search-dialog').classList.add('hidden');
	}

	function handleSearchKeyup(e) {
		if (e.key === 'Enter' && document.querySelector('.service-search-dialog li:first-child > a')) {
			document.querySelector('.service-search-dialog li:first-child > a').click();
		}
		else {
			updateServiceList();
		}
	}

	function handleESKeyup(e) {
		if (e.key === 'Escape' && document.querySelector('.service-search-dialog:not(.hidden)')) {
			closeServiceSearchDialog();
		}
	}

	function checkPersonsList() {
		if (document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]') && !document.querySelector('.__es__persons-list')) {
			preparePersonsList();
		}
	}

	function preparePersonsList() {
		let search = document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]');
		if (search) {
			search.addEventListener('input', handlePersonSearch);
			let personsList = (
				<ul className='__es__persons-list'></ul>
			)
			console.log(personsList);
			search.parentNode.appendChild(personsList)
		}
	}

	async function handlePersonSearch() {
		let search = document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]');
		let personsList = document.querySelector('.__es__persons-list');
		if (search && personsList && search.value && search.value.match(/^([А-яёЁ])+\s([А-яёЁ])*/g)) {
			let lastName = search.value.split(' ')[0];
			let response = await fetch('http://172.153.153.48/api/v1/search/persons', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + localStorage.accessToken,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					'search': {
						'search': [{
							'field': 'data.person.lastName',
							'operator': 'eq',
							'value': lastName[0].toUpperCase() + lastName.substr(1)
						}]
					},
					'sort': 'dateLastModification,DESC',
				})
			});
			if (response.ok) {
				ES.persons = await response.json();
				ES.persons = ES.persons.content;
				console.log(ES.persons);
				updatePersonsList(ES.persons);
			} else {
				console.warn('Ошибка HTTP: ' + response.status);
			}
		}
		else if (ES.persons) {
			ES.persons = [];
			updatePersonsList(ES.persons);
		}
	}

	function updatePersonsList(persons) {
		let personsList = document.querySelector('.__es__persons-list');
		if (persons && personsList) {
			personsList.innerHTML = '';
			persons.forEach(person => {
				let personElement = (
					<li key={person._id} className='__es__persons-list__person-element __es__person'>
						<button type='button' className='__es__person__trigger' onClick={handlePersonClick}>
							<span className='__es__person__name'>{ `${person.data.person.lastName} ${person.data.person.firstName}${person.data.person.middleName ? ' ' + person.data.person.middleName : ''}` }</span>,
							<span>{ ` ${person.data.person.birthday ? person.data.person.birthday.formatted : ''}` }</span>
							<div>{ person.data.person.documentType ? `${person.data.person.documentType[0].text} ${person.data.person.documentSeries} ${person.data.person.documentNumber}` : '' }</div>
						</button>
					</li>
				);
				personsList.appendChild(personElement);
			})
		}
	}

	function handlePersonClick(e) {
		let person = ES.persons.filter(person => person._id === e.currentTarget.parentNode.getAttribute('key'))[0];
		fillPersonData(person.data.person);
	}

	function fillPersonData(person) {
		let fioInput = document.querySelector('input[name=fio]')

		fioInput.value = `${person.lastName} ${person.firstName}${person.middleName ? ' ' + person.middleName : ''}`;
		optionalRenderValue(person.birthday.formatted, 'date-picker[name=birthday] input[name=mydate]');
		optionalRenderValue(person.birthday.formatted, 'date-picker[name=birthday] input[name=mydate] + input');

		optionalRenderValue(person.citizenship.name, 'individual-object-document catalogue[name=citizenship] input')
		optionalRenderValue(person.documentSeries, 'individual-object-document input[name=documentSeries]');
		optionalRenderValue(person.documentNumber, 'individual-object-document input[name=documentNumber]');
		optionalRenderValue(person.documentIssueDate.formatted, 'individual-object-document date-picker[name=documentIssueDate] input[name=mydate]');
		optionalRenderValue(person.documentIssueDate.formatted, 'individual-object-document date-picker[name=documentIssueDate] input[name=mydate] + input');

		if (!optionalRenderValue(person.documentIssuer.name, 'individual-object-document catalogue[name=documentIssuer] input[type=text]')) {
			optionalRenderValue(person.documentIssuer.code, 'individual-object-document input[name=documentIssuerCode]');
			optionalRenderValue(person.documentIssuer.name, 'individual-object-document  input[name=documentIssuerName]');
		}

		optionalRenderValue(person.birthPlace.unrecognizablePart, 'individual-object-document fias input[type=text]:not([placeholder])')

		optionalRenderValue(person.snils, 'input[name=snils]');
		optionalRenderValue(person.mobile, 'input[name=mobile]')
	}

	function optionalRenderValue(value, targetQuery) {
		if (value) {
			let targetElement = document.querySelector(targetQuery);
			if (targetElement) {
				targetElement.value = value;
				return true;
			}
		}
		return false;
	}

	let initInterval = setInterval(checkLoadState, 100);
})();
