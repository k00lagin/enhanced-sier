// ==UserScript==
// @name         Ehanced_SIER
// @namespace    k00lagin.enhanced-sier
// @updateURL    https://raw.githubusercontent.com/k00lagin/enhanced-sier/master/main.js
// @version      0.0.4
// @description  Make SIER great again!
// @author       Vsevolod Kulagin
// @match        http://172.153.153.48/ais/*
// @grant        none
// ==/UserScript==


(function () {
	'use strict';

	let ES = {
		aliases: {
			719747: 'прописка',
			723392: 'права',
			727489: 'снилс',
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
				"search": {
					"search": [{
						"field": "units.id",
						"operator": "eq",
						"value": "58bd51815744bf06e001b57b"
					}]
				},
				"size": 200,
				"sort": "serviceCode,DESC",
				"prj": "servicesList"
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
			console.warn("Ошибка HTTP: " + response.status);
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
		let serviceSearchTrigger = document.createElement('button');
		let navigationContainer = document.querySelector('.navigation.navigation-main');
		navigationContainer.style = `
			display: flex;
			flex-flow: column nowrap;
		`;
		serviceSearchTrigger.classList.add('service-search-trigger','icon-magic-wand');
		serviceSearchTrigger.style = `
			order: -1;
			height: 40px;
			background-color: inherit;
			border: 0;
		`;
		serviceSearchTrigger.addEventListener('click', openServiceSearchDialog);
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
		createServiceSearchDialog()
		document.body.addEventListener('keyup', handleESKeyup);
	}

	function createServiceSearchDialog() {
		let dialog = document.createElement('dialog');
		dialog.classList.add('service-search-dialog', 'hidden');
		dialog.style = `
			width: 600px;
			height: calc(100% - 100px);
			position: fixed;
			top: 60px;
			z-index: 10;
			display: flex;
			flex-flow: column nowrap;
			padding: 13px 0 0 13px;
		`;
		let header = document.createElement('header');
		header.style = `
			display: flex;
			margin-bottom: 8px;
			font-family:Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
			font-size:19px;
			font-weight:500;
		`;
		let title = document.createElement('span');
		title.textContent = 'Начало нового дела';
		title.style = `
			flex-grow: 1;
		`;
		header.appendChild(title);
		let closeDialogTrigger = document.createElement('button');
		closeDialogTrigger.addEventListener('click', closeServiceSearchDialog);
		closeDialogTrigger.classList.add('icon-cross');
		closeDialogTrigger.style = `
			margin-left: 8px;
			margin-right: 13px;
			background-color: transparent;
			border: 0;
		`;
		header.appendChild(closeDialogTrigger);
		dialog.appendChild(header);
		let serviceSearchInput = document.createElement('input');
		serviceSearchInput.classList.add('service-search-input', 'form-control');
		serviceSearchInput.addEventListener('keyup', updateServiceList);
		serviceSearchInput.addEventListener('keyup', handleSearchKeyup);
		serviceSearchInput.style = `
			margin: 0 13px 8px 0;
			width: calc(100% - 13px);
		`;
		serviceSearchInput.placeholder = 'Часть названия услуги, её код, или псевдоним...'
		dialog.appendChild(serviceSearchInput);
		let serviceListNode = document.createElement('ul');
		serviceListNode.classList.add('service-list-node');
		serviceListNode.style = `
			overflow-y: scroll;
			list-style: none;
			padding: 0;
			flex-grow: 1;
			margin: 0;
		`;
		dialog.appendChild(serviceListNode);
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
			let listItem = document.createElement('li');
			let serviceCode = document.createElement('span');
			serviceCode.textContent = service.sid;
			serviceCode.style = `
				margin-right: 8px;
			`;
			listItem.appendChild(serviceCode);
			let serviceLink = document.createElement('a');
			serviceLink.textContent = service.name;
			serviceLink.href = 'http://172.153.153.48/ais/appeals/create/' + service.id;
			listItem.appendChild(serviceLink);
			serviceListNode.appendChild(listItem);
		})
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
	}

	function handleESKeyup(e) {
		if (e.key === 'Escape' && document.querySelector('.service-search-dialog:not(.hidden)')) {
			closeServiceSearchDialog();
		}
	}

	let initInterval = setInterval(checkLoadState, 100);
})();
