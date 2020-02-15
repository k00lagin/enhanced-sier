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
		serviceList: [],
		persons: [],
		recentClients: [],
		lastPersonSearchString: ''
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
		let subservices = await fetchData({
			url: 'api/v1/search/subservices',
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
		subservices = subservices.content
		subservices.forEach(subservice => {
			let service = {
				id: subservice._id,
				sid: subservice.serviceId.split('_')[3],
				name: subservice.serviceName
			}
			ES.serviceList.push(service);
		});
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
		if (document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]') && !document.querySelector('.__es__search-flyout')) {
			preparePersonsList();
		}
	}

	function preparePersonsList() {
		let search = document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]');
		fetchRecentAppeals()
		if (search) {
			search.addEventListener('input', handlePersonSearch);
			search.addEventListener('focus', handleSearchFocus);
			search.parentNode.appendChild(
				<div className='__es__search-flyout'>
					<ul className='__es__recent-clients-list'></ul>
					<ul className='__es__persons-list'></ul>
				</div>
			);
		}
	}

	async function handlePersonSearch() {
		let search = document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]');
		let personsList = document.querySelector('.__es__persons-list');
		let recentClientList = document.querySelector('.__es__recent-clients-list');
		if (search.value === '') {
			ES.lastPersonSearchString = '';
		}
		if (search && recentClientList && search.value && ES.recentClients.length > 0) {
			let filteredClients = [...ES.recentClients.filter(client => client.lastName.toLowerCase().indexOf(search.value.toLowerCase()) === 0), ...ES.recentClients.filter(client => client.lastName.toLowerCase().indexOf(search.value.toLowerCase()) > 0)];
			updatePersonsList(filteredClients, recentClientList);
		}
		if (search && personsList && search.value) {
			let searchComponents = search.value.split(' ');
			var searchParams = [];
			var searchString = '';
			if (searchComponents.length > 1) {
				let lastName = searchComponents[0];
				searchParams.push({
					'field': 'data.person.lastName',
					'operator': 'eq',
					'value': lastName[0].toUpperCase() + lastName.substr(1)
				});
				searchString += lastName[0].toUpperCase() + lastName.substr(1);
				if (searchComponents.length > 2) {
					var firstName = searchComponents[1];
					searchParams.push({
						'field': 'data.person.firstName',
						'operator': 'eq',
						'value': firstName[0].toUpperCase() + firstName.substr(1)
					});
					searchString += firstName[0].toUpperCase() + firstName.substr(1);
					if (searchComponents.length > 3) {
						var middleName = searchComponents[2];
						searchParams.push({
							'field': 'data.person.middleName',
							'operator': 'eq',
							'value': middleName[0].toUpperCase() + middleName.substr(1)
						});
						searchString += middleName[0].toUpperCase() + middleName.substr(1);
					}
				}
			}
			if (searchParams.length > 0 && ES.lastPersonSearchString !== searchString) {
				ES.lastPersonSearchString = searchString;
				ES.persons = await fetchData({
					url: 'api/v1/search/persons',
					body: JSON.stringify({
						'search': {
							'search': searchParams
						},
						'sort': 'dateLastModification,DESC',
					})
				});
				ES.persons = ES.persons.content;
				updatePersonsList(ES.persons, document.querySelector('.__es__persons-list'));
			}
		}
		else if (ES.persons) {
			ES.persons = [];
			updatePersonsList(ES.persons, document.querySelector('.__es__persons-list'));
			updatePersonsList([], document.querySelector('.__es__recent-clients-list'));
		}
	}

	function handleSearchFocus() {
		let search = document.querySelector('input[placeholder="Поиск по ФИО, СНИЛС или номеру мобильного телефона в реестре клиентов..."]');
		if (search.value === '') {
			ES.lastPersonSearchString = '';
		}
	}

	function updatePersonsList(persons, listNode) {
		if (persons && listNode) {
			listNode.innerHTML = '';
			persons.forEach(person => {
				let id = person._id || person.reestrId;
				if (person.data) {
					person = person.data.person;
				}
				let personElement = (
					<li key={id} className='__es__persons-list__person-element __es__person'>
						<button type='button' className='__es__person__trigger' onClick={handlePersonClick}>
							<span className='__es__person__name'>{`${person.lastName} ${person.firstName}${person.middleName ? ' ' + person.middleName : ''}`}</span>,
							<span>{` ${person.birthday ? person.birthday.formatted : ''}`}</span>
							<div>{person.documentType ? `${person.documentType[0].text} ${person.documentSeries} ${person.documentNumber}` : ''}</div>
						</button>
					</li>
				);
				listNode.appendChild(personElement);
			})
		}
	}

	function handlePersonClick(e) {
		let person = ES.recentClients.filter(person => person.reestrId === e.currentTarget.parentNode.getAttribute('key'))[0];
		if (!person) {
			person = ES.persons.filter(person => person._id === e.currentTarget.parentNode.getAttribute('key'))[0].data.person;
		}
		fillPersonData(person);
	}

	function fillPersonData(person) {
		let fioInput = document.querySelector('input[name=fio]')
		fioInput.value = `${person.lastName} ${person.firstName}${person.middleName ? ' ' + person.middleName : ''}`;
		fioInput.dispatchEvent(new Event('input'));
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
				targetElement.dispatchEvent(new Event('input'));
				return true;
			}
		}
		return false;
	}

	async function fetchRecentAppeals() {
		let appeals = await fetchData({
			url: 'api/v1/search/appeals',
			body: JSON.stringify({
				"search": {
					"search": [{
						"field": "unit.id",
						"operator": "eq",
						"value": JSON.parse(localStorage.currentOrganization)._id
					},
					{
						"field": "userCreation.login",
						"operator": "eq",
						"value": JSON.parse(localStorage.user).login
					}]
				},
				"sort": "dateLastModification,DESC"
			})
		});
		appeals.content.forEach(appeal => {
			appeal.objects.forEach(object => {
				if (object.data && object.data.person && !ES.recentClients.some(client => client.reestrId === object.data.person.reestrId)) {
					ES.recentClients.push(object.data.person);
				}
			});
		});
	}

	async function fetchData(options) {
		console.log(options);
		return new Promise((resolve, reject) => {
			let baseUrl = 'http://172.153.153.48/';
			let url = baseUrl + options.url;
			let body = { body: options.body } || {};
			fetch(url, options.selfContained || {
				method: options.method || 'POST',
				headers: options.headers || {
					Accept: 'application/hal+json',
					Authorization: 'Bearer ' + localStorage.accessToken,
					'Content-Type': 'application/json'
				},
				...body
			}).then(response => response.json()).then(result => {
					if (result.errorMessage === 'KPP:Token expire') {
						refreshCredentials().then(() => {
							fetchData(options).then(data => resolve(data));
						});
					}
					else if (result.errorMessage) {
						reject(new Error(result.errorMessage));
					}
					else {
						console.log(result);
						resolve(result)
					}
				}), error => {
				reject(new Error(error));
			}
		})
	}

	function refreshCredentials() {
		return new Promise((resolve, reject) => {
			fetchData({
				url: 'refresh' + '?refreshToken=' + localStorage.refreshToken,
				headers: {
					'Accept': 'application/hal+json',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
				}
			}).then(result => {
				if (result && result.accessToken && result.refreshToken) {
					localStorage.setItem('accessToken', result.accessToken);
					localStorage.setItem('refreshToken', result.refreshToken);
					resolve();
				}
			}), error => {
				reject(new Error(error));
			};
		});
	}

	let initInterval = setInterval(checkLoadState, 100);
})();
